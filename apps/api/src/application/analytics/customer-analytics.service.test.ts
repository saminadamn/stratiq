import { describe, expect, it } from 'vitest';
import { CustomerAnalyticsService } from './customer-analytics.service.js';
import { columns } from './test-fixtures.js';

const service = new CustomerAnalyticsService();
const cols = columns({
  customerId: 'customerId',
  orderId: 'orderId',
  orderDate: 'date',
  revenue: 'revenue',
});

describe('CustomerAnalyticsService', () => {
  it('classifies new vs returning customers by distinct order count', () => {
    const rows = [
      { customerId: 'A', orderId: 'O1', date: '2024-01-01', revenue: '10' },
      { customerId: 'A', orderId: 'O2', date: '2024-02-01', revenue: '10' },
      { customerId: 'B', orderId: 'O3', date: '2024-01-01', revenue: '10' },
    ];
    const result = service.build(rows, cols);
    expect(result.newCustomers).toBe(1);
    expect(result.returningCustomers).toBe(1);
  });

  it('computes month-over-month retention for the most recent transition', () => {
    const rows = [
      { customerId: 'A', orderId: 'O1', date: '2024-01-01', revenue: '10' },
      { customerId: 'A', orderId: 'O2', date: '2024-02-01', revenue: '10' },
      { customerId: 'B', orderId: 'O3', date: '2024-01-01', revenue: '10' },
    ];
    // Active in Jan: A, B (2). Active in Feb: A only. Retained 1/2 = 50%.
    const result = service.build(rows, cols);
    expect(result.retentionRate).toBe(50);
  });

  it('ranks top customers by total spend', () => {
    const rows = [
      { customerId: 'A', orderId: 'O1', date: '2024-01-01', revenue: '100' },
      { customerId: 'B', orderId: 'O2', date: '2024-01-01', revenue: '500' },
    ];
    const result = service.build(rows, cols);
    expect(result.topCustomers[0]?.customerId).toBe('B');
  });

  it('buckets customers into rule-based segments', () => {
    const rows = [
      { customerId: 'A', orderId: 'O1', date: '2024-01-01', revenue: '10' },
      { customerId: 'B', orderId: 'O2', date: '2024-01-01', revenue: '10' },
      { customerId: 'B', orderId: 'O3', date: '2024-01-01', revenue: '10' },
    ];
    const result = service.build(rows, cols);
    const bySegment = Object.fromEntries(
      result.segmentBreakdown.map((entry) => [entry.segment, entry.customerCount]),
    );
    expect(bySegment['NEW']).toBe(1);
    expect(bySegment['RETURNING']).toBe(1);
    expect(bySegment['LOYAL']).toBe(0);
  });

  it('filters rows down to customers matching a segment', () => {
    const rows = [
      { customerId: 'A', orderId: 'O1', date: '2024-01-01', revenue: '10' },
      { customerId: 'B', orderId: 'O2', date: '2024-01-01', revenue: '10' },
      { customerId: 'B', orderId: 'O3', date: '2024-01-01', revenue: '10' },
    ];
    const filtered = service.filterRowsBySegment(rows, cols, 'RETURNING');
    expect(filtered).toHaveLength(2);
    expect(filtered.every((row) => row['customerId'] === 'B')).toBe(true);
  });

  it('builds a cohort table keyed by each customer first-purchase month', () => {
    const rows = [
      { customerId: 'A', orderId: 'O1', date: '2024-01-01', revenue: '10' },
      { customerId: 'A', orderId: 'O2', date: '2024-02-01', revenue: '10' },
    ];
    const result = service.build(rows, cols);
    expect(result.cohortAnalysis).toEqual([
      { cohortPeriod: '2024-01', retainedCustomersByPeriod: [1, 1] },
    ]);
  });
});
