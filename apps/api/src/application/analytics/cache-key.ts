import type { AnalyticsFiltersDto } from '@stratiq/shared';

// A cache key of (datasetVersionId, dashboard scope, normalized filters) is
// safe to cache indefinitely — see docs/ARCHITECTURE.md, "Sprint 3" — because
// DatasetVersion rows are immutable (Sprint 2 decision): the same key can
// never legitimately produce a different correct answer, so there's no
// staleness to invalidate against, only memory to bound (see
// InMemoryAnalyticsCache's eviction).
export function buildAnalyticsCacheKey(
  datasetVersionId: string,
  scope: string,
  filters: AnalyticsFiltersDto,
): string {
  const normalized = {
    dateFrom: filters.dateFrom ?? null,
    dateTo: filters.dateTo ?? null,
    category: filters.category ?? null,
    region: filters.region ?? null,
    productId: filters.productId ?? null,
    customerSegment: filters.customerSegment ?? null,
  };
  return `${datasetVersionId}:${scope}:${JSON.stringify(normalized)}`;
}
