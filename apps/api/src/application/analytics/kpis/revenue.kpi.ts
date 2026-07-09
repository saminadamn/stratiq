import type { AnalyticsColumns } from '../column-detection.js';
import { rowRevenue } from '../row-metrics.js';
import { round2 } from '../rounding.js';

export function calculateRevenue(
  rows: Array<Record<string, unknown>>,
  columns: AnalyticsColumns,
): number {
  const total = rows.reduce((sum, row) => sum + (rowRevenue(row, columns) ?? 0), 0);
  return round2(total);
}
