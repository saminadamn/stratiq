import { describe, expect, it } from 'vitest';
import { columns } from '../test-fixtures.js';
import { calculateGrossProfit } from './gross-profit.kpi.js';

describe('calculateGrossProfit', () => {
  it('sums an explicit profit column', () => {
    const result = calculateGrossProfit(
      [{ profit: '20' }, { profit: '30' }],
      columns({ profit: 'profit' }),
    );
    expect(result).toBe(50);
  });

  it('derives profit from revenue minus cost when no profit column exists', () => {
    const result = calculateGrossProfit(
      [{ revenue: '100', cost: '60' }],
      columns({ revenue: 'revenue', cost: 'cost' }),
    );
    expect(result).toBe(40);
  });

  it('returns null (not 0) when there is no profit or cost basis', () => {
    expect(calculateGrossProfit([{ revenue: '100' }], columns({ revenue: 'revenue' }))).toBeNull();
  });
});
