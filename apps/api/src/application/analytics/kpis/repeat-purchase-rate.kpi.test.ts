import { describe, expect, it } from 'vitest';
import { columns } from '../test-fixtures.js';
import { calculateRepeatPurchaseRate } from './repeat-purchase-rate.kpi.js';

describe('calculateRepeatPurchaseRate', () => {
  it('computes the percentage of customers with more than one order', () => {
    const rows = [
      { customerId: 'A', orderId: 'O1' },
      { customerId: 'A', orderId: 'O2' },
      { customerId: 'B', orderId: 'O3' },
    ];
    const result = calculateRepeatPurchaseRate(
      rows,
      columns({ customerId: 'customerId', orderId: 'orderId' }),
    );
    expect(result).toBe(50);
  });

  it('treats each row as a separate order when there is no order id column', () => {
    const rows = [{ customerId: 'A' }, { customerId: 'A' }, { customerId: 'B' }];
    const result = calculateRepeatPurchaseRate(rows, columns({ customerId: 'customerId' }));
    expect(result).toBe(50);
  });

  it('returns null without a customer id column', () => {
    expect(calculateRepeatPurchaseRate([{ x: 1 }], columns())).toBeNull();
  });
});
