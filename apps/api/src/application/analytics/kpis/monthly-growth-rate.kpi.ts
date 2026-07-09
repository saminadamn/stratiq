import type { AnalyticsColumns } from '../column-detection.js';
import { rowDate, rowRevenue } from '../row-metrics.js';
import { round2 } from '../rounding.js';

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

// Percentage change in revenue between the most recent two months present in
// the (already filtered) rows. Null when there's fewer than two months of
// data to compare — growth is a period-over-period concept, not something a
// single month can answer.
export function calculateMonthlyGrowthRate(
  rows: Array<Record<string, unknown>>,
  columns: AnalyticsColumns,
): number | null {
  if (!columns.orderDate) {
    return null;
  }

  const revenueByMonth = new Map<string, number>();
  for (const row of rows) {
    const date = rowDate(row, columns);
    const revenue = rowRevenue(row, columns);
    if (!date || revenue === null) {
      continue;
    }
    const key = monthKey(date);
    revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + revenue);
  }

  const months = [...revenueByMonth.keys()].sort();
  if (months.length < 2) {
    return null;
  }

  const lastMonth = months[months.length - 1] as string;
  const previousMonth = months[months.length - 2] as string;
  const lastRevenue = revenueByMonth.get(lastMonth) as number;
  const previousRevenue = revenueByMonth.get(previousMonth) as number;
  if (previousRevenue === 0) {
    return null;
  }

  return round2(((lastRevenue - previousRevenue) / previousRevenue) * 100);
}
