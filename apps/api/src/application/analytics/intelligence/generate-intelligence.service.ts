import type { TimeSeriesPointDto } from '@stratiq/shared';
import type { AlertRepository } from '../../../domain/repositories/alert.repository.js';
import type { BusinessRuleRepository } from '../../../domain/repositories/business-rule.repository.js';
import type { InsightRepository } from '../../../domain/repositories/insight.repository.js';
import type { MetricDefinitionRepository } from '../../../domain/repositories/metric-definition.repository.js';
import type { AnalyticsDatasetContext } from '../resolve-analytics-dataset.service.js';
import { ensureDefaultBusinessRules } from './ensure-default-business-rules.js';
import type { InsightEngineService } from './insight-engine.service.js';
import type { MetricCalculator } from './metric-calculators.js';
import { computeMetricMonthlySeries } from './metric-time-series.js';

// Orchestrates one pass of insight/alert generation for a dataset version and
// persists the results. Insights+alerts are generated once per immutable
// DatasetVersion (see docs/ARCHITECTURE.md's caching pattern from Sprint 3)
// rather than on every request, so this is only ever called from a use case
// that first checks whether generation is needed.
export class GenerateIntelligenceService {
  // The Insights and Alerts panels mount together and both call
  // ensureGenerated for the same dataset version; without this, both could
  // read countByDatasetVersion === 0 before either had inserted anything and
  // double-generate. Keyed by datasetVersionId so unrelated dataset versions
  // still generate concurrently.
  private readonly inFlight = new Map<string, Promise<void>>();

  constructor(
    private readonly metricDefinitions: MetricDefinitionRepository,
    private readonly businessRules: BusinessRuleRepository,
    private readonly insights: InsightRepository,
    private readonly alerts: AlertRepository,
    private readonly insightEngine: InsightEngineService,
    private readonly calculators: Record<string, MetricCalculator>,
  ) {}

  async ensureGenerated(
    organizationId: string,
    context: AnalyticsDatasetContext,
    forceRefresh: boolean,
  ): Promise<void> {
    const existing = this.inFlight.get(context.datasetVersionId);
    if (existing) {
      return existing;
    }

    const promise = this.generate(organizationId, context, forceRefresh).finally(() => {
      this.inFlight.delete(context.datasetVersionId);
    });
    this.inFlight.set(context.datasetVersionId, promise);
    return promise;
  }

  private async generate(
    organizationId: string,
    context: AnalyticsDatasetContext,
    forceRefresh: boolean,
  ): Promise<void> {
    if (!forceRefresh) {
      const existingCount = await this.insights.countByDatasetVersion(context.datasetVersionId);
      if (existingCount > 0) {
        return;
      }
    }

    const [metrics, rules] = await Promise.all([
      this.metricDefinitions.listAll(),
      ensureDefaultBusinessRules(this.businessRules, organizationId),
    ]);

    const monthlySeriesByMetric: Record<string, TimeSeriesPointDto[]> = {};
    for (const metric of metrics) {
      const calculator = this.calculators[metric.key];
      if (!calculator) {
        continue;
      }
      monthlySeriesByMetric[metric.key] = computeMetricMonthlySeries(
        context.rows,
        context.columns,
        calculator,
      );
    }

    const generatedInsights = this.insightEngine.generate(
      context.rows,
      context.columns,
      metrics,
      this.calculators,
      monthlySeriesByMetric,
      rules,
    );

    for (const generated of generatedInsights) {
      if (generated.currentValue === null) {
        continue;
      }

      await this.insights.create({
        organizationId,
        datasetVersionId: context.datasetVersionId,
        metricKey: generated.metricKey,
        title: generated.title,
        narrative: generated.narrative,
        trend: generated.trend,
        severity: generated.severity,
        currentValue: generated.currentValue,
        previousValue: generated.previousValue,
        changePercent: generated.changePercent,
        metadata:
          generated.outlierPeriods.length > 0 ? { outlierPeriods: generated.outlierPeriods } : null,
      });

      for (const ruleId of generated.triggeredRuleIds) {
        const rule = rules.find((candidate) => candidate.id === ruleId);
        if (!rule) {
          continue;
        }
        await this.alerts.create({
          organizationId,
          datasetVersionId: context.datasetVersionId,
          metricKey: generated.metricKey,
          ruleId: rule.id,
          severity: rule.severity,
          message: `${generated.title}: ${generated.narrative}`,
          currentValue: generated.currentValue,
          thresholdValue: rule.thresholdValue,
        });
      }
    }
  }
}
