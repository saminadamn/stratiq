import type { AnalyticsColumns } from '../column-detection.js';
import { rowOrderId } from '../row-metrics.js';

// Falls back to row count when there's no distinct order id column — the
// same "each row is one order" proxy used elsewhere (Sprint 2 feature
// engineering's average_order_value / repeat_purchase_rate).
export function calculateTotalOrders(
  rows: Array<Record<string, unknown>>,
  columns: AnalyticsColumns,
): number {
  if (!columns.orderId) {
    return rows.length;
  }
  const orderIds = new Set(
    rows.map((row) => rowOrderId(row, columns)).filter((id): id is string => id !== null),
  );
  return orderIds.size;
}
