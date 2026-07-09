import { describe, expect, it } from 'vitest';
import { columns } from '../test-fixtures.js';
import { calculateMonthlyGrowthRate } from './monthly-growth-rate.kpi.js';

describe('calculateMonthlyGrowthRate', () => {
  it('computes percentage change between the two most recent months', () => {
    const rows = [
      { date: '2024-01-15', revenue: '100' },
      { date: '2024-02-15', revenue: '150' },
    ];
    const result = calculateMonthlyGrowthRate(
      rows,
      columns({ orderDate: 'date', revenue: 'revenue' }),
    );
    expect(result).toBe(50);
  });

  it('returns null with fewer than two months of data', () => {
    const rows = [{ date: '2024-01-15', revenue: '100' }];
    expect(
      calculateMonthlyGrowthRate(rows, columns({ orderDate: 'date', revenue: 'revenue' })),
    ).toBeNull();
  });

  it('returns null without a date column', () => {
    expect(
      calculateMonthlyGrowthRate([{ revenue: '100' }], columns({ revenue: 'revenue' })),
    ).toBeNull();
  });
});
