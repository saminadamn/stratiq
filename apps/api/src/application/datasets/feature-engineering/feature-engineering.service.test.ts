import { describe, expect, it } from 'vitest';
import { inferSchema } from '../infer-schema.js';
import { FeatureEngineeringService } from './feature-engineering.service.js';
import type { ParsedTable } from '../../ports/file-parser.port.js';

const service = new FeatureEngineeringService();

function computeFor(table: ParsedTable) {
  const schema = inferSchema(table);
  return service.compute(table.rows, schema);
}

function value(features: ReturnType<typeof computeFor>, name: string): unknown {
  return features.find((f) => f.name === name)?.value;
}

describe('FeatureEngineeringService', () => {
  it('computes nothing when no recognizable business columns exist', () => {
    const features = computeFor({ columns: ['foo', 'bar'], rows: [{ foo: '1', bar: '2' }] });
    expect(features).toEqual([]);
  });

  it('computes total revenue and average order value from a revenue column', () => {
    const features = computeFor({
      columns: ['revenue'],
      rows: [{ revenue: '100' }, { revenue: '200' }],
    });
    expect(value(features, 'total_revenue')).toBe(300);
    // No orderId column -> each row counts as one order.
    expect(value(features, 'average_order_value')).toBe(150);
  });

  it('uses distinct order ids for average order value when present', () => {
    const features = computeFor({
      columns: ['revenue', 'orderId'],
      rows: [
        { revenue: '100', orderId: 'A' },
        { revenue: '50', orderId: 'A' },
        { revenue: '150', orderId: 'B' },
      ],
    });
    // total 300 across 2 distinct orders -> 150
    expect(value(features, 'average_order_value')).toBe(150);
  });

  it('computes customer lifetime value only when both revenue and customerId exist', () => {
    const withoutCustomer = computeFor({ columns: ['revenue'], rows: [{ revenue: '100' }] });
    expect(value(withoutCustomer, 'customer_lifetime_value')).toBeUndefined();

    const withCustomer = computeFor({
      columns: ['revenue', 'customerId'],
      rows: [
        { revenue: '100', customerId: 'C1' },
        { revenue: '200', customerId: 'C2' },
      ],
    });
    expect(value(withCustomer, 'customer_lifetime_value')).toBe(150);
  });

  it('computes repeat purchase rate from customers with more than one order', () => {
    const features = computeFor({
      columns: ['customerId', 'orderId'],
      rows: [
        { customerId: 'C1', orderId: 'O1' },
        { customerId: 'C1', orderId: 'O2' },
        { customerId: 'C2', orderId: 'O3' },
      ],
    });
    // 1 of 2 customers repeats -> 50%
    expect(value(features, 'repeat_purchase_rate')).toBe(50);
  });

  it('computes profit margin as a percentage of revenue', () => {
    const features = computeFor({
      columns: ['revenue', 'profit'],
      rows: [{ revenue: '200', profit: '50' }],
    });
    expect(value(features, 'profit_margin')).toBe(25);
  });

  it('groups monthly revenue and only computes quarterly growth with 2+ quarters', () => {
    const singleQuarter = computeFor({
      columns: ['revenue', 'orderDate'],
      rows: [{ revenue: '100', orderDate: '2024-01-15' }],
    });
    expect(value(singleQuarter, 'monthly_revenue')).toEqual([{ month: '2024-01', revenue: 100 }]);
    expect(value(singleQuarter, 'quarterly_growth')).toBeUndefined();

    const twoQuarters = computeFor({
      columns: ['revenue', 'orderDate'],
      rows: [
        { revenue: '100', orderDate: '2024-01-15' },
        { revenue: '150', orderDate: '2024-04-15' },
      ],
    });
    expect(value(twoQuarters, 'quarterly_growth')).toEqual([
      { quarter: '2024-Q1', revenue: 100, growthPercent: null },
      { quarter: '2024-Q2', revenue: 150, growthPercent: 50 },
    ]);
  });
});
