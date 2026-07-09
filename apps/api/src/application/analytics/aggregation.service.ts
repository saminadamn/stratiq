import type { CategoryValueDto } from '@stratiq/shared';
import type { AnalyticsColumns } from './column-detection.js';
import { rowCategory, rowRegion, rowRevenue } from './row-metrics.js';
import { round2 } from './rounding.js';

type Row = Record<string, unknown>;

// Generic group-and-sum shared by every "value by X" breakdown (category,
// region, and reused by product/inventory analytics for their own
// groupings) — one place decides how grouping/summing/sorting/rounding
// works, so these breakdowns can't drift from each other.
export function groupSum(
  rows: Row[],
  keyFor: (row: Row) => string | null,
  valueFor: (row: Row) => number | null,
): CategoryValueDto[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = keyFor(row);
    const value = valueFor(row);
    if (key === null || value === null) {
      continue;
    }
    totals.set(key, (totals.get(key) ?? 0) + value);
  }
  return [...totals.entries()]
    .map(([label, value]) => ({ label, value: round2(value) }))
    .sort((a, b) => b.value - a.value);
}

export class AggregationService {
  revenueByCategory(rows: Row[], columns: AnalyticsColumns): CategoryValueDto[] {
    if (!columns.category) {
      return [];
    }
    return groupSum(
      rows,
      (row) => rowCategory(row, columns),
      (row) => rowRevenue(row, columns),
    );
  }

  revenueByRegion(rows: Row[], columns: AnalyticsColumns): CategoryValueDto[] {
    if (!columns.region) {
      return [];
    }
    return groupSum(
      rows,
      (row) => rowRegion(row, columns),
      (row) => rowRevenue(row, columns),
    );
  }
}
