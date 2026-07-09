import type { AnalyticsFiltersDto, CustomerDashboardDto } from '@stratiq/shared';
import type { AnalyticsCache } from '../../ports/analytics-cache.port.js';
import { buildAnalyticsCacheKey } from '../cache-key.js';
import type { CustomerAnalyticsService } from '../customer-analytics.service.js';
import { resolveFilteredContext } from '../resolve-filtered-context.js';
import type { ResolveAnalyticsDatasetService } from '../resolve-analytics-dataset.service.js';

const CACHE_SCOPE = 'customers';

// Backs both GET /analytics/customers and GET /analytics/dashboard/customer
// (see docs/ARCHITECTURE.md, Sprint 3) — the Sprint 3 spec lists them
// separately, but they're the same customer-analytics payload, so one use
// case serves both routes rather than duplicating the composition.
export class GetCustomerAnalyticsUseCase {
  constructor(
    private readonly resolveDataset: ResolveAnalyticsDatasetService,
    private readonly customerAnalytics: CustomerAnalyticsService,
    private readonly cache: AnalyticsCache,
  ) {}

  async execute(
    organizationId: string,
    filters: AnalyticsFiltersDto,
  ): Promise<CustomerDashboardDto> {
    const context = await resolveFilteredContext(
      this.resolveDataset,
      this.customerAnalytics,
      organizationId,
      filters,
    );

    const cacheKey = buildAnalyticsCacheKey(context.datasetVersionId, CACHE_SCOPE, filters);
    const cached = this.cache.get<CustomerDashboardDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const result: CustomerDashboardDto = {
      ...this.customerAnalytics.build(context.rows, context.columns),
      generatedAt: new Date().toISOString(),
      datasetId: context.datasetId,
      datasetVersionId: context.datasetVersionId,
    };
    this.cache.set(cacheKey, result);
    return result;
  }
}
