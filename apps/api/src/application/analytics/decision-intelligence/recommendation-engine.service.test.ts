import { describe, expect, it } from 'vitest';
import type { ChurnPredictionDto } from '@stratiq/shared';
import type { Alert } from '../../../domain/entities/alert.entity.js';
import type { BenchmarkResult } from '../intelligence/benchmark-engine.service.js';
import { ActionPlanBuilder } from './action-plan-builder.js';
import { RecommendationEngineService } from './recommendation-engine.service.js';
import type { RootCause } from './root-cause-analysis.service.js';

const engine = new RecommendationEngineService(new ActionPlanBuilder());

function rootCause(overrides: Partial<RootCause> = {}): RootCause {
  return {
    metricKey: 'revenue',
    title: 'Why Revenue declined',
    narrative: 'Revenue declined.',
    driverMetricKey: 'totalOrders',
    severity: 'CRITICAL',
    ...overrides,
  };
}

function benchmark(changeAbsolute: number | null): BenchmarkResult {
  return {
    metricKey: 'revenue',
    period: 'MONTH',
    currentPeriodLabel: '2024-02',
    previousPeriodLabel: '2024-01',
    currentValue: 400,
    previousValue: 1000,
    changeAbsolute,
    changePercent: -60,
  };
}

function alert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 'alert-1',
    organizationId: 'org-1',
    datasetVersionId: 'version-1',
    metricKey: 'profitMargin',
    ruleId: 'rule-1',
    severity: 'CRITICAL',
    message: 'Profit margin is negative.',
    currentValue: -5,
    thresholdValue: 0,
    status: 'OPEN',
    createdAt: new Date(),
    resolvedAt: null,
    ...overrides,
  };
}

describe('RecommendationEngineService', () => {
  it('recommends order-volume actions when totalOrders is the driver, with an ROI estimate from the revenue benchmark', () => {
    const [recommendation] = engine.fromRootCauses([rootCause()], { revenue: benchmark(-600) });
    expect(recommendation?.recommendationText).toContain('order volume');
    expect(recommendation?.roiEstimate).toBe(300); // 600 * 0.5 recovery factor
    expect(recommendation?.priority).toBe('CRITICAL');
    expect(recommendation?.actionPlan).toHaveLength(3);
  });

  it('gives the recommendation a distinct title from the root cause it came from', () => {
    // Regression test: GenerateDecisionIntelligenceService persists root
    // causes and recommendations in the same createMany(skipDuplicates)
    // batch. If a recommendation ever reused its root cause's exact title,
    // the unique constraint would treat the second insert as a duplicate of
    // the first and silently drop it — this happened for real (see
    // docs/ARCHITECTURE.md's Module 8 findings) before titles were split.
    const cause = rootCause();
    const [recommendation] = engine.fromRootCauses([cause], { revenue: benchmark(-600) });
    expect(recommendation?.title).not.toBe(cause.title);
  });

  it('recommends AOV actions when averageOrderValue is the driver', () => {
    const [recommendation] = engine.fromRootCauses(
      [rootCause({ driverMetricKey: 'averageOrderValue' })],
      {},
    );
    expect(recommendation?.recommendationText).toContain('average order value');
  });

  it('does not estimate ROI when the benchmark shows growth, not decline', () => {
    const [recommendation] = engine.fromRootCauses([rootCause()], { revenue: benchmark(500) });
    expect(recommendation?.roiEstimate).toBeNull();
  });

  it('produces one recommendation per matching alert type', () => {
    const recommendations = engine.fromAlerts([alert(), alert({ metricKey: 'inventoryTurnover' })]);
    expect(recommendations).toHaveLength(2);
    expect(recommendations[0]?.title).toContain('profit margin');
    expect(recommendations[1]?.title).toContain('inventory turnover');
  });

  it('produces no churn recommendation when nobody is above the risk threshold', () => {
    const predictions: ChurnPredictionDto[] = [
      {
        customerId: 'C1',
        customerName: null,
        churnProbability: 0.2,
        confidence: 0.8,
        explanation: { method: 'x', topFeatures: [] },
      },
    ];
    expect(engine.fromChurnPredictions(predictions, 100)).toEqual([]);
  });

  it('estimates churn ROI from average customer value and the retention success rate', () => {
    const predictions: ChurnPredictionDto[] = [
      {
        customerId: 'C1',
        customerName: null,
        churnProbability: 0.9,
        confidence: 0.8,
        explanation: { method: 'x', topFeatures: [] },
      },
      {
        customerId: 'C2',
        customerName: null,
        churnProbability: 0.7,
        confidence: 0.8,
        explanation: { method: 'x', topFeatures: [] },
      },
    ];
    const [recommendation] = engine.fromChurnPredictions(predictions, 100);
    expect(recommendation?.roiEstimate).toBe(60); // 2 customers * 100 * 0.3
  });
});
