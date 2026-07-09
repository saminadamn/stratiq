import { describe, expect, it } from 'vitest';
import { columns } from '../test-fixtures.js';
import { calculateRevenue } from './revenue.kpi.js';

describe('calculateRevenue', () => {
  it('sums an explicit revenue column', () => {
    const result = calculateRevenue(
      [{ revenue: '100' }, { revenue: '50' }],
      columns({ revenue: 'revenue' }),
    );
    expect(result).toBe(150);
  });

  it('falls back to quantity * unitPrice when no revenue column exists', () => {
    const result = calculateRevenue(
      [
        { qty: '2', price: '10' },
        { qty: '3', price: '10' },
      ],
      columns({ quantity: 'qty', unitPrice: 'price' }),
    );
    expect(result).toBe(50);
  });

  it('returns 0 when no revenue basis is available', () => {
    expect(calculateRevenue([{ foo: 'bar' }], columns())).toBe(0);
  });
});
