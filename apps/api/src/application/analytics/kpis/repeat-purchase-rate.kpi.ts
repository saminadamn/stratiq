import type { AnalyticsColumns } from '../column-detection.js';
import { rowCustomerId, rowOrderId } from '../row-metrics.js';
import { round2 } from '../rounding.js';

export function calculateRepeatPurchaseRate(
  rows: Array<Record<string, unknown>>,
  columns: AnalyticsColumns,
): number | null {
  if (!columns.customerId) {
    return null;
  }

  // Each customer maps to the set of distinct "orders" they made. With no
  // order id column, the row object itself stands in for one order — every
  // row is a distinct object reference, so this still counts one order per
  // row per customer as a fallback proxy (same pattern as Sprint 2's
  // computeRepeatPurchaseRate feature).
  const ordersByCustomer = new Map<string, Set<unknown>>();
  for (const row of rows) {
    const customerId = rowCustomerId(row, columns);
    if (!customerId) {
      continue;
    }
    const orderKey: unknown = columns.orderId ? rowOrderId(row, columns) : row;
    const orders = ordersByCustomer.get(customerId) ?? new Set<unknown>();
    orders.add(orderKey);
    ordersByCustomer.set(customerId, orders);
  }

  const totalCustomers = ordersByCustomer.size;
  if (totalCustomers === 0) {
    return null;
  }

  const repeatCustomers = [...ordersByCustomer.values()].filter((orders) => orders.size > 1).length;
  return round2((repeatCustomers / totalCustomers) * 100);
}
