import { describe, expect, it } from 'vitest';
import { columns } from './test-fixtures.js';
import { TimeSeriesService } from './time-series.service.js';

const service = new TimeSeriesService();

describe('TimeSeriesService', () => {
  it('groups revenue into monthly buckets, sorted chronologically', () => {
    const rows = [
      { date: '2024-02-01', revenue: '50' },
      { date: '2024-01-15', revenue: '100' },
      { date: '2024-01-20', revenue: '25' },
    ];
    const result = service.monthlyRevenueTrend(
      rows,
      columns({ orderDate: 'date', revenue: 'revenue' }),
    );
    expect(result).toEqual([
      { period: '2024-01', value: 125 },
      { period: '2024-02', value: 50 },
    ]);
  });

  it('counts distinct orders per month', () => {
    const rows = [
      { date: '2024-01-15', orderId: 'A' },
      { date: '2024-01-20', orderId: 'A' },
      { date: '2024-01-25', orderId: 'B' },
    ];
    const result = service.ordersOverTime(rows, columns({ orderDate: 'date', orderId: 'orderId' }));
    expect(result).toEqual([{ period: '2024-01', value: 2 }]);
  });

  it('returns an empty array without a date column', () => {
    expect(
      service.monthlyRevenueTrend([{ revenue: '1' }], columns({ revenue: 'revenue' })),
    ).toEqual([]);
  });
});
