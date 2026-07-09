import type { AnalyticsColumns } from '../column-detection.js';
import { round2 } from '../rounding.js';
import { calculateActiveCustomers } from './active-customers.kpi.js';
import { calculateRevenue } from './revenue.kpi.js';

export function calculateCustomerLifetimeValue(
  rows: Array<Record<string, unknown>>,
  columns: AnalyticsColumns,
): number | null {
  if (!columns.customerId) {
    return null;
  }
  const customerCount = calculateActiveCustomers(rows, columns);
  if (customerCount === 0) {
    return null;
  }
  return round2(calculateRevenue(rows, columns) / customerCount);
}
