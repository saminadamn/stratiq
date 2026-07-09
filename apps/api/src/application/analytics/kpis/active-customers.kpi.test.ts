import { describe, expect, it } from 'vitest';
import { columns } from '../test-fixtures.js';
import { calculateActiveCustomers } from './active-customers.kpi.js';

describe('calculateActiveCustomers', () => {
  it('counts distinct customer ids', () => {
    const rows = [{ customerId: 'A' }, { customerId: 'A' }, { customerId: 'B' }];
    expect(calculateActiveCustomers(rows, columns({ customerId: 'customerId' }))).toBe(2);
  });

  it('returns 0 when there is no customer id column', () => {
    expect(calculateActiveCustomers([{ x: 1 }], columns())).toBe(0);
  });
});
