import { describe, expect, it } from 'vitest';
import type { BusinessRule } from '../../../domain/entities/business-rule.entity.js';
import type { MetricDefinition } from '../../../domain/entities/metric-definition.entity.js';
import { columns } from '../test-fixtures.js';
import { BenchmarkEngineService } from './benchmark-engine.service.js';
import { BusinessRulesEngineService } from './business-rules-engine.service.js';
import { InsightEngineService } from './insight-engine.service.js';
import type { MetricCalculator } from './metric-calculators.js';
import { computeMetricMonthlySeries } from './metric-time-series.js';
import { TrendDetectionService } from './trend-detection.service.js';

function metric(overrides: Partial<MetricDefinition> = {}): MetricDefinition {
  return {
    id: 'metric-1',
    key: 'revenue',
    name: 'Revenue',
    description: 'Total revenue',
    category: 'REVENUE',
    formula: 'SUM(revenue)',
    unit: 'CURRENCY',
    owner: 'Finance',
    refreshPolicy: 'REALTIME',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function rule(overrides: Partial<BusinessRule> = {}): BusinessRule {
  return {
    id: 'rule-1',
    organizationId: 'org-1',
    metricKey: 'revenue',
    name: 'Revenue decline warning',
    comparator: 'PERCENT_CHANGE_BELOW',
    thresholdValue: -10,
    severity: 'WARNING',
    isActive: true,
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const revenueCalculator: MetricCalculator = (rows) =>
  rows.reduce((sum, row) => sum + Number(row['revenue'] ?? 0), 0);

const engine = new InsightEngineService(
  new TrendDetectionService(),
  new BenchmarkEngineService(),
  new BusinessRulesEngineService(),
);

describe('InsightEngineService', () => {
  it('generates an insight with a benchmark-driven narrative and no triggered rules when nothing fires', () => {
    const rows = [
      { date: '2026-05-01', revenue: 100 },
      { date: '2026-06-01', revenue: 110 },
    ];
    const cols = columns({ orderDate: 'date', revenue: 'revenue' });
    const calculators = { revenue: revenueCalculator };
    const series = { revenue: computeMetricMonthlySeries(rows, cols, revenueCalculator) };

    const insights = engine.generate(rows, cols, [metric()], calculators, series, []);

    expect(insights).toHaveLength(1);
    expect(insights[0]?.metricKey).toBe('revenue');
    expect(insights[0]?.triggeredRuleIds).toEqual([]);
    expect(insights[0]?.narrative).toContain('Revenue');
  });

  it('attaches a triggered business rule and escalates severity to match it', () => {
    const rows = [
      { date: '2026-05-01', revenue: 1000 },
      { date: '2026-06-01', revenue: 500 },
    ];
    const cols = columns({ orderDate: 'date', revenue: 'revenue' });
    const calculators = { revenue: revenueCalculator };
    const series = { revenue: computeMetricMonthlySeries(rows, cols, revenueCalculator) };

    const insights = engine.generate(rows, cols, [metric()], calculators, series, [rule()]);

    expect(insights[0]?.triggeredRuleIds).toEqual(['rule-1']);
    expect(insights[0]?.severity).toBe('WARNING');
    expect(insights[0]?.narrative).toContain('Revenue decline warning');
  });

  it('skips a metric that has no calculator registered', () => {
    const rows = [{ date: '2026-06-01', revenue: 100 }];
    const cols = columns({ orderDate: 'date', revenue: 'revenue' });

    const insights = engine.generate(rows, cols, [metric({ key: 'unknownMetric' })], {}, {}, []);

    expect(insights).toEqual([]);
  });

  it('skips a metric that cannot be computed for the current dataset (no date column)', () => {
    const rows = [{ revenue: 100 }];
    const cols = columns({ revenue: 'revenue' });
    const calculators = { revenue: revenueCalculator };

    const insights = engine.generate(rows, cols, [metric()], calculators, {}, []);

    expect(insights).toEqual([]);
  });
});
