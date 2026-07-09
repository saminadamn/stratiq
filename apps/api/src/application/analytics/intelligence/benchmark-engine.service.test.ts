import { describe, expect, it } from 'vitest';
import { columns } from '../test-fixtures.js';
import { calculateRevenue } from '../kpis/revenue.kpi.js';
import { BenchmarkEngineService } from './benchmark-engine.service.js';

const service = new BenchmarkEngineService();

describe('BenchmarkEngineService', () => {
  it('compares the latest month present in the data against the prior month', () => {
    const rows = [
      { date: '2026-05-01', revenue: '100' },
      { date: '2026-05-15', revenue: '100' },
      { date: '2026-06-01', revenue: '150' },
      { date: '2026-06-15', revenue: '150' },
    ];
    const cols = columns({ orderDate: 'date', revenue: 'revenue' });

    const result = service.compare(rows, cols, 'revenue', calculateRevenue, 'MONTH');

    expect(result).not.toBeNull();
    expect(result?.currentValue).toBe(300);
    expect(result?.previousValue).toBe(200);
    expect(result?.changeAbsolute).toBe(100);
    expect(result?.changePercent).toBe(50);
  });

  it('anchors "current" to the latest date in the data, not the system clock', () => {
    const rows = [
      { date: '2020-01-15', revenue: '10' },
      { date: '2020-02-15', revenue: '20' },
    ];
    const cols = columns({ orderDate: 'date', revenue: 'revenue' });

    const result = service.compare(rows, cols, 'revenue', calculateRevenue, 'MONTH');

    expect(result?.currentPeriodLabel).toContain('2020');
    expect(result?.currentValue).toBe(20);
    expect(result?.previousValue).toBe(10);
  });

  it('returns null when the dataset has no date column', () => {
    const rows = [{ revenue: '100' }];
    const cols = columns({ revenue: 'revenue' });

    expect(service.compare(rows, cols, 'revenue', calculateRevenue, 'MONTH')).toBeNull();
  });

  it('returns a null previousValue and changePercent when there is no prior-period data', () => {
    const rows = [{ date: '2026-06-01', revenue: '100' }];
    const cols = columns({ orderDate: 'date', revenue: 'revenue' });

    const result = service.compare(rows, cols, 'revenue', calculateRevenue, 'MONTH');

    expect(result?.currentValue).toBe(100);
    expect(result?.previousValue).toBeNull();
    expect(result?.changePercent).toBeNull();
  });
});
