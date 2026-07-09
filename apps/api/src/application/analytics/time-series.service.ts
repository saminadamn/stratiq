import type { TimeSeriesPointDto } from '@stratiq/shared';
import type { AnalyticsColumns } from './column-detection.js';
import { rowDate, rowOrderId, rowRevenue } from './row-metrics.js';
import { round2 } from './rounding.js';

type Row = Record<string, unknown>;

export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export class TimeSeriesService {
  monthlyRevenueTrend(rows: Row[], columns: AnalyticsColumns): TimeSeriesPointDto[] {
    if (!columns.orderDate) {
      return [];
    }
    const totals = new Map<string, number>();
    for (const row of rows) {
      const date = rowDate(row, columns);
      const revenue = rowRevenue(row, columns);
      if (!date || revenue === null) {
        continue;
      }
      const key = monthKey(date);
      totals.set(key, (totals.get(key) ?? 0) + revenue);
    }
    return [...totals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, value]) => ({ period, value: round2(value) }));
  }

  ordersOverTime(rows: Row[], columns: AnalyticsColumns): TimeSeriesPointDto[] {
    if (!columns.orderDate) {
      return [];
    }
    const ordersByMonth = new Map<string, Set<unknown>>();
    for (const row of rows) {
      const date = rowDate(row, columns);
      if (!date) {
        continue;
      }
      const key = monthKey(date);
      const orderKey: unknown = columns.orderId ? rowOrderId(row, columns) : row;
      const orders = ordersByMonth.get(key) ?? new Set<unknown>();
      orders.add(orderKey);
      ordersByMonth.set(key, orders);
    }
    return [...ordersByMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, orders]) => ({ period, value: orders.size }));
  }
}
