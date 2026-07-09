import type { AnalyticsColumns } from '../column-detection.js';
import { round2 } from '../rounding.js';
import { calculateTotalOrders } from './orders.kpi.js';
import { calculateRevenue } from './revenue.kpi.js';

export function calculateAverageOrderValue(
  rows: Array<Record<string, unknown>>,
  columns: AnalyticsColumns,
): number {
  const orders = calculateTotalOrders(rows, columns);
  if (orders === 0) {
    return 0;
  }
  return round2(calculateRevenue(rows, columns) / orders);
}
