import type { ChurnPredictionDto, DecisionCategory, RecommendationPriority } from '@stratiq/shared';
import type { AlertRepository } from '../../../domain/repositories/alert.repository.js';
import type { DecisionRecommendationRepository } from '../../../domain/repositories/decision-recommendation.repository.js';
import type { InsightRepository } from '../../../domain/repositories/insight.repository.js';
import type { PredictionRepository } from '../../../domain/repositories/prediction.repository.js';
import type { BenchmarkResult } from '../intelligence/benchmark-engine.service.js';
import type { BenchmarkEngineService } from '../intelligence/benchmark-engine.service.js';
import type { MetricCalculator } from '../intelligence/metric-calculators.js';
import type { AnalyticsDatasetContext } from '../resolve-analytics-dataset.service.js';
import type { GeneratedRecommendation } from './recommendation-engine.service.js';
import type { RecommendationEngineService } from './recommendation-engine.service.js';
import type { RootCauseAnalysisService } from './root-cause-analysis.service.js';

// Benchmarked so root-cause attribution can compare revenue against its
// known drivers (see root-cause-analysis.service.ts's METRIC_DRIVERS table).
const BENCHMARK_KEYS = ['revenue', 'totalOrders', 'averageOrderValue'];

function severityToImpact(severity: 'INFO' | 'WARNING' | 'CRITICAL'): number {
  return severity === 'CRITICAL' ? 90 : severity === 'WARNING' ? 60 : 30;
}

function severityToPriority(severity: 'INFO' | 'WARNING' | 'CRITICAL'): RecommendationPriority {
  return severity === 'CRITICAL' ? 'CRITICAL' : severity === 'WARNING' ? 'HIGH' : 'MEDIUM';
}

// Orchestrates Root Cause Analysis + the Recommendation Engine from
// Insights + Alerts + Benchmarks + Predictions already computed by earlier
// sprints (Analytics engine, Sprint 4 Intelligence Layer, v1.0 Predictive
// Intelligence) — this class computes nothing about the business itself,
// only composes those existing outputs into recommendations, exactly like
// GenerateIntelligenceService composes Trend/Benchmark/Rules into insights.
export class GenerateDecisionIntelligenceService {
  constructor(
    private readonly insights: InsightRepository,
    private readonly alerts: AlertRepository,
    private readonly predictions: PredictionRepository,
    private readonly decisionRecommendations: DecisionRecommendationRepository,
    private readonly benchmarkEngine: BenchmarkEngineService,
    private readonly rootCauseAnalysis: RootCauseAnalysisService,
    private readonly recommendationEngine: RecommendationEngineService,
    private readonly calculators: Record<string, MetricCalculator>,
  ) {}

  async ensureGenerated(
    organizationId: string,
    context: AnalyticsDatasetContext,
    forceRefresh: boolean,
  ): Promise<void> {
    const existing = await this.decisionRecommendations.findByDatasetVersion(
      context.datasetVersionId,
    );
    // Rows generated before the finding/businessImpact/confidence/team
    // narrative fields existed have `finding: null` on every ROOT_CAUSE row
    // and `confidence: null` on every RECOMMENDATION row (the mapper always
    // sets both for new rows). Treat those as stale and regenerate instead of
    // serving the old raw rule-engine text forever — ensureGenerated is
    // otherwise idempotent per dataset version, so this only fires once per
    // legacy dataset.
    const isLegacy = existing.some(
      (row) =>
        (row.category === 'ROOT_CAUSE' && row.finding === null) ||
        (row.category === 'RECOMMENDATION' && row.confidence === null),
    );
    if (!forceRefresh && existing.length > 0 && !isLegacy) {
      return;
    }
    if (existing.length > 0) {
      await this.decisionRecommendations.deleteByDatasetVersion(context.datasetVersionId);
    }

    const [insightRows, alertRows, churnPredictionRows] = await Promise.all([
      this.insights.findByDatasetVersion(context.datasetVersionId),
      this.alerts.findByDatasetVersion(context.datasetVersionId),
      this.predictions.findByDatasetVersion(context.datasetVersionId, 'CHURN'),
    ]);

    const benchmarks = this.computeBenchmarks(context);
    const rootCauses = this.rootCauseAnalysis.analyze(insightRows, benchmarks);

    const churnPredictions: ChurnPredictionDto[] = churnPredictionRows.map((prediction) => ({
      customerId: prediction.targetId as string,
      customerName: (prediction.valueJson['customerName'] as string | null) ?? null,
      churnProbability: prediction.valueJson['churnProbability'] as number,
      confidence: prediction.confidence,
      explanation: prediction.explanationJson as unknown as ChurnPredictionDto['explanation'],
    }));
    const averageCustomerValue =
      this.calculators['customerLifetimeValue']?.(context.rows, context.columns) ?? null;

    const recommendations: GeneratedRecommendation[] = [
      ...this.recommendationEngine.fromRootCauses(rootCauses, benchmarks),
      ...this.recommendationEngine.fromAlerts(alertRows),
      ...this.recommendationEngine.fromChurnPredictions(churnPredictions, averageCustomerValue),
    ];

    const rootCauseInputs = rootCauses.map((cause) => ({
      organizationId,
      datasetVersionId: context.datasetVersionId,
      category: 'ROOT_CAUSE' as DecisionCategory,
      title: cause.title,
      rootCause: cause.diagnosticDetail,
      recommendationText: null,
      roiEstimate: null,
      impactScore: severityToImpact(cause.severity),
      priority: severityToPriority(cause.severity),
      actionPlanJson: null,
      sourceRefsJson: { metricKey: cause.metricKey, driverMetricKey: cause.driverMetricKey },
      finding: cause.finding,
      businessImpact: cause.businessImpact,
      confidence: cause.confidence,
      severity: cause.severity,
      changePercent: cause.changePercent,
      team: null,
    }));

    const recommendationInputs = recommendations.map((recommendation) => ({
      organizationId,
      datasetVersionId: context.datasetVersionId,
      category: 'RECOMMENDATION' as DecisionCategory,
      title: recommendation.title,
      rootCause: null,
      recommendationText: recommendation.recommendationText,
      roiEstimate: recommendation.roiEstimate,
      impactScore: recommendation.impactScore,
      priority: recommendation.priority,
      actionPlanJson: recommendation.actionPlan,
      sourceRefsJson: {},
      finding: null,
      businessImpact: null,
      confidence: recommendation.confidence,
      severity: null,
      changePercent: null,
      team: recommendation.team,
    }));

    await this.decisionRecommendations.createMany([...rootCauseInputs, ...recommendationInputs]);
  }

  private computeBenchmarks(context: AnalyticsDatasetContext): Record<string, BenchmarkResult> {
    const benchmarks: Record<string, BenchmarkResult> = {};
    for (const key of BENCHMARK_KEYS) {
      const calculator = this.calculators[key];
      if (!calculator) {
        continue;
      }
      const result = this.benchmarkEngine.compare(
        context.rows,
        context.columns,
        key,
        calculator,
        'MONTH',
      );
      if (result) {
        benchmarks[key] = result;
      }
    }
    return benchmarks;
  }
}
