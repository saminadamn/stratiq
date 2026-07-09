import type { AnalyticsFiltersDto, ProductDashboardDto } from '@stratiq/shared';
import type { AnalyticsCache } from '../../ports/analytics-cache.port.js';
import { buildAnalyticsCacheKey } from '../cache-key.js';
import type { CustomerAnalyticsService } from '../customer-analytics.service.js';
import type { ProductAnalyticsService } from '../product-analytics.service.js';
import { resolveFilteredContext } from '../resolve-filtered-context.js';
import type { ResolveAnalyticsDatasetService } from '../resolve-analytics-dataset.service.js';

const CACHE_SCOPE = 'products';

// Backs both GET /analytics/products and GET /analytics/dashboard/product —
// see get-customer-analytics.use-case.ts for why one use case serves both.
export class GetProductAnalyticsUseCase {
  constructor(
    private readonly resolveDataset: ResolveAnalyticsDatasetService,
    private readonly customerAnalytics: CustomerAnalyticsService,
    private readonly productAnalytics: ProductAnalyticsService,
    private readonly cache: AnalyticsCache,
  ) {}

  async execute(
    organizationId: string,
    filters: AnalyticsFiltersDto,
  ): Promise<ProductDashboardDto> {
    const context = await resolveFilteredContext(
      this.resolveDataset,
      this.customerAnalytics,
      organizationId,
      filters,
    );

    const cacheKey = buildAnalyticsCacheKey(context.datasetVersionId, CACHE_SCOPE, filters);
    const cached = this.cache.get<ProductDashboardDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const result: ProductDashboardDto = {
      ...this.productAnalytics.build(context.rows, context.columns),
      generatedAt: new Date().toISOString(),
      datasetId: context.datasetId,
      datasetVersionId: context.datasetVersionId,
    };
    this.cache.set(cacheKey, result);
    return result;
  }
}
