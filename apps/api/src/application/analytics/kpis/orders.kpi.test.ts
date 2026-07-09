import { describe, expect, it } from 'vitest';
import { columns } from '../test-fixtures.js';
import { calculateTotalOrders } from './orders.kpi.js';

describe('calculateTotalOrders', () => {
  it('counts distinct order ids when present', () => {
    const result = calculateTotalOrders(
      [{ orderId: 'A' }, { orderId: 'A' }, { orderId: 'B' }],
      columns({ orderId: 'orderId' }),
    );
    expect(result).toBe(2);
  });

  it('falls back to row count when there is no order id column', () => {
    const result = calculateTotalOrders([{ x: 1 }, { x: 2 }, { x: 3 }], columns());
    expect(result).toBe(3);
  });
});
