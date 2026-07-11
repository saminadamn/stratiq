import type { AnalyticsFiltersDto, KpiSummaryDto } from '@stratiq/shared';
import type { AnalyticsCache } from '../../ports/analytics-cache.port.js';
import { buildAnalyticsCacheKey } from '../cache-key.js';
import type { CustomerAnalyticsService } from '../customer-analytics.service.js';
import type { InventoryAnalyticsService } from '../inventory-analytics.service.js';
import type { KpiEngineService } from '../kpis/kpi-engine.service.js';
import type { ProductAnalyticsService } from '../product-analytics.service.js';
import { resolveFilteredContext } from '../resolve-filtered-context.js';
import type { ResolveAnalyticsDatasetService } from '../resolve-analytics-dataset.service.js';

const TOP_PRODUCTS_LIMIT = 5;
const CACHE_SCOPE = 'kpis';

export class GetKpiSummaryUseCase {
  constructor(
    private readonly resolveDataset: ResolveAnalyticsDatasetService,
    private readonly customerAnalytics: CustomerAnalyticsService,
    private readonly productAnalytics: ProductAnalyticsService,
    private readonly inventoryAnalytics: InventoryAnalyticsService,
    private readonly kpiEngine: KpiEngineService,
    private readonly cache: AnalyticsCache,
  ) {}

  async execute(organizationId: string, filters: AnalyticsFiltersDto): Promise<KpiSummaryDto> {
    const context = await resolveFilteredContext(
      this.resolveDataset,
      this.customerAnalytics,
      organizationId,
      filters,
    );

    const cacheKey = buildAnalyticsCacheKey(context.datasetVersionId, CACHE_SCOPE, filters);
    const cached = await this.cache.get<KpiSummaryDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const pureSummary = this.kpiEngine.computeSummary(context.rows, context.columns);
    const topProducts = this.productAnalytics.getTopProducts(
      context.rows,
      context.columns,
      TOP_PRODUCTS_LIMIT,
    );
    const inventoryTurnover = this.inventoryAnalytics.calculateTurnover(
      context.rows,
      context.columns,
    );

    const summary: KpiSummaryDto = { ...pureSummary, topProducts, inventoryTurnover };
    await this.cache.set(cacheKey, summary);
    return summary;
  }
}
