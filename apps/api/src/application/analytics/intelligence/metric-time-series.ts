import type { TimeSeriesPointDto } from '@stratiq/shared';
import type { AnalyticsColumns } from '../column-detection.js';
import { rowDate } from '../row-metrics.js';
import { monthKey } from '../time-series.service.js';
import type { MetricCalculator } from './metric-calculators.js';

type Row = Record<string, unknown>;

// Generic version of Sprint 3's monthlyRevenueTrend — buckets rows by month
// and runs *any* metric calculator over each bucket, rather than being
// hardcoded to revenue. This is what lets Trend Detection and the Insight
// Engine work uniformly across every metric in the registry.
export function computeMetricMonthlySeries(
  rows: Row[],
  columns: AnalyticsColumns,
  calculator: MetricCalculator,
): TimeSeriesPointDto[] {
  if (!columns.orderDate) {
    return [];
  }

  const rowsByMonth = new Map<string, Row[]>();
  for (const row of rows) {
    const date = rowDate(row, columns);
    if (!date) {
      continue;
    }
    const key = monthKey(date);
    const bucket = rowsByMonth.get(key) ?? [];
    bucket.push(row);
    rowsByMonth.set(key, bucket);
  }

  return [...rowsByMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, bucketRows]) => ({ period, value: calculator(bucketRows, columns) ?? 0 }));
}
