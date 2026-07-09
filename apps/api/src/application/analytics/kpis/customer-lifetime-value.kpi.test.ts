import { describe, expect, it } from 'vitest';
import { columns } from '../test-fixtures.js';
import { calculateCustomerLifetimeValue } from './customer-lifetime-value.kpi.js';

describe('calculateCustomerLifetimeValue', () => {
  it('divides revenue by distinct customer count', () => {
    const rows = [
      { customerId: 'A', revenue: '100' },
      { customerId: 'B', revenue: '200' },
    ];
    const result = calculateCustomerLifetimeValue(
      rows,
      columns({ customerId: 'customerId', revenue: 'revenue' }),
    );
    expect(result).toBe(150);
  });

  it('returns null when there is no customer id column', () => {
    expect(
      calculateCustomerLifetimeValue([{ revenue: '100' }], columns({ revenue: 'revenue' })),
    ).toBeNull();
  });
});
