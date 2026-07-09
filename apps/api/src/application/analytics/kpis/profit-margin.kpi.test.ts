import { describe, expect, it } from 'vitest';
import { columns } from '../test-fixtures.js';
import { calculateProfitMargin } from './profit-margin.kpi.js';

describe('calculateProfitMargin', () => {
  it('computes gross profit as a percentage of revenue', () => {
    const result = calculateProfitMargin(
      [{ revenue: '200', profit: '50' }],
      columns({ revenue: 'revenue', profit: 'profit' }),
    );
    expect(result).toBe(25);
  });

  it('returns null when revenue is zero', () => {
    expect(calculateProfitMargin([], columns({ revenue: 'revenue', profit: 'profit' }))).toBeNull();
  });

  it('returns null when there is no profit basis', () => {
    const result = calculateProfitMargin([{ revenue: '100' }], columns({ revenue: 'revenue' }));
    expect(result).toBeNull();
  });
});
