import type { AnalyticsFiltersDto } from '@stratiq/shared';
import type { AnalyticsColumns } from './column-detection.js';
import { rowCategory, rowDate, rowProductId, rowRegion } from './row-metrics.js';

// Row-level filters only — date range, category, region, product. Customer
// segment is NOT applied here: a segment ("NEW"/"RETURNING"/"LOYAL") is
// derived from a customer's full order history across the dataset, so
// filtering by it is customer-analytics.service's job (it already has to
// scan every row once to compute segments in the first place).
export function applyAnalyticsFilters(
  rows: Array<Record<string, unknown>>,
  columns: AnalyticsColumns,
  filters: AnalyticsFiltersDto,
): Array<Record<string, unknown>> {
  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
  const dateTo = filters.dateTo ? new Date(filters.dateTo) : null;

  return rows.filter((row) => {
    if (dateFrom || dateTo) {
      const date = rowDate(row, columns);
      if (!date) {
        return false;
      }
      if (dateFrom && date < dateFrom) {
        return false;
      }
      if (dateTo && date > dateTo) {
        return false;
      }
    }

    if (filters.category && rowCategory(row, columns) !== filters.category) {
      return false;
    }

    if (filters.region && rowRegion(row, columns) !== filters.region) {
      return false;
    }

    if (filters.productId && rowProductId(row, columns) !== filters.productId) {
      return false;
    }

    return true;
  });
}
