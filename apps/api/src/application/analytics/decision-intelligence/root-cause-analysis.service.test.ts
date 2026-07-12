import { describe, expect, it } from 'vitest';
import type { Insight } from '../../../domain/entities/insight.entity.js';
import type { BenchmarkResult } from '../intelligence/benchmark-engine.service.js';
import { RootCauseAnalysisService } from './root-cause-analysis.service.js';

const service = new RootCauseAnalysisService();

function insight(overrides: Partial<Insight> = {}): Insight {
  return {
    id: 'insight-1',
    organizationId: 'org-1',
    datasetVersionId: 'version-1',
    metricKey: 'revenue',
    title: 'Revenue is trending down',
    narrative: 'Revenue decreased 60% to $400.',
    trend: 'DECLINING',
    severity: 'CRITICAL',
    currentValue: 400,
    previousValue: 1000,
    changePercent: -60,
    metadata: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function benchmark(metricKey: string, changePercent: number | null): BenchmarkResult {
  return {
    metricKey,
    period: 'MONTH',
    currentPeriodLabel: '2024-02',
    previousPeriodLabel: '2024-01',
    currentValue: 100,
    previousValue: 200,
    changeAbsolute: -100,
    changePercent,
  };
}

describe('RootCauseAnalysisService', () => {
  it('ignores insights that are not declining', () => {
    const result = service.analyze([insight({ trend: 'STABLE' })], {});
    expect(result).toEqual([]);
  });

  it('attributes a revenue decline to whichever driver moved most negatively', () => {
    const benchmarks = {
      totalOrders: benchmark('totalOrders', -50),
      averageOrderValue: benchmark('averageOrderValue', -5),
    };
    const [cause] = service.analyze([insight()], benchmarks);
    expect(cause?.driverMetricKey).toBe('totalOrders');
    expect(cause?.diagnosticDetail).toContain('totalOrders');
  });

  it('picks the other driver when it is the larger negative mover', () => {
    const benchmarks = {
      totalOrders: benchmark('totalOrders', -5),
      averageOrderValue: benchmark('averageOrderValue', -40),
    };
    const [cause] = service.analyze([insight()], benchmarks);
    expect(cause?.driverMetricKey).toBe('averageOrderValue');
  });

  it('falls back to a null driver when no driver data is available', () => {
    const [cause] = service.analyze([insight()], {});
    expect(cause?.driverMetricKey).toBeNull();
    expect(cause?.diagnosticDetail).toBe(insight().narrative);
  });

  it('composes a driver-aware finding without threshold/rule jargon', () => {
    const benchmarks = {
      totalOrders: benchmark('totalOrders', -50),
      averageOrderValue: benchmark('averageOrderValue', -5),
    };
    const [cause] = service.analyze([insight()], benchmarks);
    expect(cause?.finding).toBe(
      'Revenue declined by 60.0%, driven primarily by Total Orders (-50.0%).',
    );
    expect(cause?.finding).not.toContain('threshold');
    expect(cause?.finding).not.toContain('Revenue decline warning');
  });

  it('falls back to a driver-less finding when no driver is attributed', () => {
    const [cause] = service.analyze([insight()], {});
    expect(cause?.finding).toBe('Revenue declined by 60.0%.');
  });

  it('assigns HIGH confidence when a driver is found and severity is CRITICAL', () => {
    const benchmarks = { totalOrders: benchmark('totalOrders', -50) };
    const [cause] = service.analyze([insight({ severity: 'CRITICAL' })], benchmarks);
    expect(cause?.confidence).toBe('HIGH');
  });

  it('assigns LOW confidence when there is no driver and severity is INFO', () => {
    const [cause] = service.analyze([insight({ severity: 'INFO' })], {});
    expect(cause?.confidence).toBe('LOW');
  });

  it('carries the metric label and businessImpact through to the recommendation payload', () => {
    const [cause] = service.analyze([insight()], {});
    expect(cause?.businessImpact).toContain('cash flow');
    expect(cause?.changePercent).toBe(-60);
  });

  it('does not attribute a driver for a metric with no known drivers', () => {
    const [cause] = service.analyze(
      [
        insight({
          metricKey: 'repeatPurchaseRate',
          title: 'Repeat Purchase Rate is trending down',
        }),
      ],
      {},
    );
    expect(cause?.driverMetricKey).toBeNull();
  });
});
