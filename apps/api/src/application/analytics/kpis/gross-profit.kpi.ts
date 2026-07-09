import type { AnalyticsColumns } from '../column-detection.js';
import { rowProfit } from '../row-metrics.js';
import { round2 } from '../rounding.js';

// Null (not 0) when there's no profit/cost basis at all — a dataset with no
// cost data hasn't "zero profit," it's simply unknown, and the dashboard
// should say so rather than imply a loss-making business.
export function calculateGrossProfit(
  rows: Array<Record<string, unknown>>,
  columns: AnalyticsColumns,
): number | null {
  const profits = rows
    .map((row) => rowProfit(row, columns))
    .filter((profit): profit is number => profit !== null);
  if (profits.length === 0) {
    return null;
  }
  return round2(profits.reduce((sum, profit) => sum + profit, 0));
}
