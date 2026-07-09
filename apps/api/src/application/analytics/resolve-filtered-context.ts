import type { AnalyticsFiltersDto } from '@stratiq/shared';
import type { AnalyticsColumns } from './column-detection.js';
import type { CustomerAnalyticsService } from './customer-analytics.service.js';
import { applyAnalyticsFilters } from './filters.js';
import type { ResolveAnalyticsDatasetService } from './resolve-analytics-dataset.service.js';

export interface FilteredAnalyticsContext {
  datasetId: string;
  datasetVersionId: string;
  columns: AnalyticsColumns;
  rows: Array<Record<string, unknown>>;
}

// Shared by every analytics use case: resolve which dataset/version to read
// (explicit override or the org's latest READY dataset), apply row-level
// filters, then apply the customer-segment filter (which needs a full pass
// over the data to derive segments — see CustomerAnalyticsService). One
// place owns this sequence so it can't drift between the 6 use cases that
// all need it.
export async function resolveFilteredContext(
  resolveDataset: ResolveAnalyticsDatasetService,
  customerAnalytics: CustomerAnalyticsService,
  organizationId: string,
  filters: AnalyticsFiltersDto,
): Promise<FilteredAnalyticsContext> {
  const context = await resolveDataset.resolve(organizationId, filters.datasetId);
  let rows = applyAnalyticsFilters(context.rows, context.columns, filters);
  if (filters.customerSegment) {
    rows = customerAnalytics.filterRowsBySegment(rows, context.columns, filters.customerSegment);
  }
  return {
    datasetId: context.datasetId,
    datasetVersionId: context.datasetVersionId,
    columns: context.columns,
    rows,
  };
}
