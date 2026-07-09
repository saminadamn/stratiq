import type { AnalyticsColumns } from '../column-detection.js';
import { round2 } from '../rounding.js';
import { calculateGrossProfit } from './gross-profit.kpi.js';
import { calculateRevenue } from './revenue.kpi.js';

export function calculateProfitMargin(
  rows: Array<Record<string, unknown>>,
  columns: AnalyticsColumns,
): number | null {
  const revenue = calculateRevenue(rows, columns);
  if (revenue === 0) {
    return null;
  }
  const grossProfit = calculateGrossProfit(rows, columns);
  if (grossProfit === null) {
    return null;
  }
  return round2((grossProfit / revenue) * 100);
}
