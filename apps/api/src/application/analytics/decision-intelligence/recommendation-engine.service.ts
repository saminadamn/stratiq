import type { ChurnPredictionDto, RecommendationPriority } from '@stratiq/shared';
import type { Alert } from '../../../domain/entities/alert.entity.js';
import type { BenchmarkResult } from '../intelligence/benchmark-engine.service.js';
import type { ActionPlanBuilder, ActionPlanCategory, ActionPlanItem } from './action-plan-builder.js';
import type { RootCause } from './root-cause-analysis.service.js';

export interface GeneratedRecommendation {
  title: string;
  recommendationText: string;
  roiEstimate: number | null;
  impactScore: number;
  priority: RecommendationPriority;
  actionPlan: ActionPlanItem[];
}

// Assumption: acting on a revenue-decline recommendation recovers half of
// what was lost — a documented, fixed multiplier, not a fitted model. Same
// spirit as the churn-retention assumption below.
const REVENUE_RECOVERY_FACTOR = 0.5;
// Assumption: a well-targeted retention campaign saves 30% of at-risk
// customers who would otherwise churn.
const CHURN_RETENTION_SUCCESS_RATE = 0.3;
const CHURN_RISK_THRESHOLD = 0.6;

// Every recommendation here traces back to a concrete input (a root cause,
// an alert, a set of churn predictions) via a fixed template — nothing is
// freeform-generated, so the same inputs always produce the same
// recommendation (per Module 2's "avoid LLMs, deterministic and
// reproducible" requirement).
export class RecommendationEngineService {
  constructor(private readonly actionPlanBuilder: ActionPlanBuilder) {}

  fromRootCauses(
    rootCauses: RootCause[],
    benchmarks: Record<string, BenchmarkResult>,
  ): GeneratedRecommendation[] {
    return rootCauses
      .filter((cause) => cause.metricKey === 'revenue')
      .map((cause) => this.buildRevenueRecommendation(cause, benchmarks['revenue']));
  }

  fromAlerts(alerts: Alert[]): GeneratedRecommendation[] {
    const recommendations: GeneratedRecommendation[] = [];

    const marginAlert = alerts.find((alert) => alert.metricKey === 'profitMargin');
    if (marginAlert) {
      recommendations.push({
        title: 'Address negative profit margin',
        recommendationText:
          'Profit margin has fallen below zero. Review cost of goods sold and pricing on the lowest-margin products before the next reporting period.',
        roiEstimate: null,
        impactScore: marginAlert.severity === 'CRITICAL' ? 90 : 60,
        priority: marginAlert.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        actionPlan: this.actionPlanBuilder.build('NEGATIVE_PROFIT_MARGIN'),
      });
    }

    const inventoryAlert = alerts.find((alert) => alert.metricKey === 'inventoryTurnover');
    if (inventoryAlert) {
      recommendations.push({
        title: 'Improve slow inventory turnover',
        recommendationText:
          'Inventory turnover fell below the healthy threshold, tying up cash in slow-moving stock. Run a clearance promotion and adjust reorder levels.',
        roiEstimate: null,
        impactScore: 50,
        priority: 'MEDIUM',
        actionPlan: this.actionPlanBuilder.build('SLOW_INVENTORY_TURNOVER'),
      });
    }

    return recommendations;
  }

  fromChurnPredictions(
    predictions: ChurnPredictionDto[],
    averageCustomerValue: number | null,
  ): GeneratedRecommendation[] {
    const atRisk = predictions.filter((p) => p.churnProbability >= CHURN_RISK_THRESHOLD);
    if (atRisk.length === 0) {
      return [];
    }

    const roiEstimate =
      averageCustomerValue !== null
        ? Math.round(atRisk.length * averageCustomerValue * CHURN_RETENTION_SUCCESS_RATE * 100) / 100
        : null;

    return [
      {
        title: `Retain ${atRisk.length} at-risk customer${atRisk.length === 1 ? '' : 's'}`,
        recommendationText: `${atRisk.length} customer${atRisk.length === 1 ? '' : 's'} ${atRisk.length === 1 ? 'has' : 'have'} a predicted churn probability of ${Math.round(CHURN_RISK_THRESHOLD * 100)}% or higher. Launch a targeted retention campaign before the next billing/order cycle.`,
        roiEstimate,
        impactScore: Math.min(100, atRisk.length * 10),
        priority: atRisk.length >= 5 ? 'HIGH' : 'MEDIUM',
        actionPlan: this.actionPlanBuilder.build('HIGH_CHURN_RISK'),
      },
    ];
  }

  private buildRevenueRecommendation(
    cause: RootCause,
    revenueBenchmark: BenchmarkResult | undefined,
  ): GeneratedRecommendation {
    const category = this.categoryForDriver(cause.driverMetricKey);
    const priority: RecommendationPriority =
      cause.severity === 'CRITICAL' ? 'CRITICAL' : cause.severity === 'WARNING' ? 'HIGH' : 'MEDIUM';

    return {
      // Deliberately phrased differently from the root cause's own title
      // ("Why Revenue declined") — distinct wording, not just a distinct
      // category column, so the two read as clearly different entries even
      // before the DB-level dedup guard (@@unique(..., category, title))
      // comes into play.
      title: this.titleForDriver(category),
      recommendationText: this.recommendationTextFor(category),
      roiEstimate: this.estimateRevenueRoi(revenueBenchmark),
      impactScore: cause.severity === 'CRITICAL' ? 85 : cause.severity === 'WARNING' ? 55 : 30,
      priority,
      actionPlan: this.actionPlanBuilder.build(category),
    };
  }

  private estimateRevenueRoi(benchmark: BenchmarkResult | undefined): number | null {
    if (!benchmark || benchmark.changeAbsolute === null || benchmark.changeAbsolute >= 0) {
      return null;
    }
    return Math.round(Math.abs(benchmark.changeAbsolute) * REVENUE_RECOVERY_FACTOR * 100) / 100;
  }

  private categoryForDriver(driverMetricKey: string | null): ActionPlanCategory {
    if (driverMetricKey === 'totalOrders') {
      return 'REVENUE_DECLINE_ORDERS';
    }
    if (driverMetricKey === 'averageOrderValue') {
      return 'REVENUE_DECLINE_AOV';
    }
    return 'REVENUE_DECLINE_GENERIC';
  }

  private titleForDriver(category: ActionPlanCategory): string {
    switch (category) {
      case 'REVENUE_DECLINE_ORDERS':
        return 'Recommendation: Rebuild order volume';
      case 'REVENUE_DECLINE_AOV':
        return 'Recommendation: Raise average order value';
      default:
        return 'Recommendation: Investigate the revenue decline';
    }
  }

  private recommendationTextFor(category: ActionPlanCategory): string {
    switch (category) {
      case 'REVENUE_DECLINE_ORDERS':
        return 'Revenue declined primarily because order volume dropped. Focus on acquisition and win-back campaigns to rebuild order count.';
      case 'REVENUE_DECLINE_AOV':
        return 'Revenue declined primarily because average order value dropped. Introduce upsell and bundle offers to raise it back up.';
      default:
        return 'Revenue declined without a single clear driver among tracked sub-metrics. Investigate by category and region before committing spend.';
    }
  }
}
