import { describe, expect, it } from 'vitest';
import { columns } from '../test-fixtures.js';
import { calculateAverageOrderValue } from './average-order-value.kpi.js';

describe('calculateAverageOrderValue', () => {
  it('divides revenue by distinct order count', () => {
    const rows = [
      { orderId: 'A', revenue: '100' },
      { orderId: 'A', revenue: '50' },
      { orderId: 'B', revenue: '150' },
    ];
    const result = calculateAverageOrderValue(
      rows,
      columns({ orderId: 'orderId', revenue: 'revenue' }),
    );
    // total revenue 300 across 2 distinct orders
    expect(result).toBe(150);
  });

  it('returns 0 when there are no orders', () => {
    expect(calculateAverageOrderValue([], columns({ orderId: 'orderId' }))).toBe(0);
  });
});
