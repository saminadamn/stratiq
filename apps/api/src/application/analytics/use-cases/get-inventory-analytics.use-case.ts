import type { AnalyticsFiltersDto, InventoryDashboardDto } from '@stratiq/shared';
import type { AnalyticsCache } from '../../ports/analytics-cache.port.js';
import { buildAnalyticsCacheKey } from '../cache-key.js';
import type { CustomerAnalyticsService } from '../customer-analytics.service.js';
import type { InventoryAnalyticsService } from '../inventory-analytics.service.js';
import { resolveFilteredContext } from '../resolve-filtered-context.js';
import type { ResolveAnalyticsDatasetService } from '../resolve-analytics-dataset.service.js';

const CACHE_SCOPE = 'inventory';

// Backs both GET /analytics/inventory and GET /analytics/dashboard/inventory
// — see get-customer-analytics.use-case.ts for why one use case serves both.
export class GetInventoryAnalyticsUseCase {
  constructor(
    private readonly resolveDataset: ResolveAnalyticsDatasetService,
    private readonly customerAnalytics: CustomerAnalyticsService,
    private readonly inventoryAnalytics: InventoryAnalyticsService,
    private readonly cache: AnalyticsCache,
  ) {}

  async execute(
    organizationId: string,
    filters: AnalyticsFiltersDto,
  ): Promise<InventoryDashboardDto> {
    const context = await resolveFilteredContext(
      this.resolveDataset,
      this.customerAnalytics,
      organizationId,
      filters,
    );

    const cacheKey = buildAnalyticsCacheKey(context.datasetVersionId, CACHE_SCOPE, filters);
    const cached = await this.cache.get<InventoryDashboardDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const result: InventoryDashboardDto = {
      ...this.inventoryAnalytics.build(context.rows, context.columns),
      generatedAt: new Date().toISOString(),
      datasetId: context.datasetId,
      datasetVersionId: context.datasetVersionId,
    };
    await this.cache.set(cacheKey, result);
    return result;
  }
}
