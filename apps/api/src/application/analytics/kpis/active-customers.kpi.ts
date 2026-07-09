import type { AnalyticsColumns } from '../column-detection.js';
import { rowCustomerId } from '../row-metrics.js';

export function calculateActiveCustomers(
  rows: Array<Record<string, unknown>>,
  columns: AnalyticsColumns,
): number {
  if (!columns.customerId) {
    return 0;
  }
  const customerIds = new Set(
    rows.map((row) => rowCustomerId(row, columns)).filter((id): id is string => id !== null),
  );
  return customerIds.size;
}
