import type { AnalyticsFiltersDto, ExecutiveDashboardDto, KpiSummaryDto } from '@stratiq/shared';
import type { AnalyticsCache } from '../../ports/analytics-cache.port.js';
import type { AggregationService } from '../aggregation.service.js';
import { buildAnalyticsCacheKey } from '../cache-key.js';
import type { CustomerAnalyticsService } from '../customer-analytics.service.js';
import type { InventoryAnalyticsService } from '../inventory-analytics.service.js';
import type { KpiEngineService } from '../kpis/kpi-engine.service.js';
import type { ProductAnalyticsService } from '../product-analytics.service.js';
import { resolveFilteredContext } from '../resolve-filtered-context.js';
import type { ResolveAnalyticsDatasetService } from '../resolve-analytics-dataset.service.js';
import type { TimeSeriesService } from '../time-series.service.js';

const TOP_PRODUCTS_LIMIT = 5;
const LOW_STOCK_ALERT_LIMIT = 5;
const CACHE_SCOPE = 'dashboard:executive';

// The one genuinely composite dashboard — it pulls from every specialized
// service exactly once each (inventory's `build()` is called a single time
// and its turnover/low-stock results are reused for both the KPI summary
// and the dedicated inventory widgets, rather than recomputed).
export class GetExecutiveDashboardUseCase {
  constructor(
    private readonly resolveDataset: ResolveAnalyticsDatasetService,
    private readonly customerAnalytics: CustomerAnalyticsService,
    private readonly productAnalytics: ProductAnalyticsService,
    private readonly inventoryAnalytics: InventoryAnalyticsService,
    private readonly kpiEngine: KpiEngineService,
    private readonly timeSeries: TimeSeriesService,
    private readonly aggregation: AggregationService,
    private readonly cache: AnalyticsCache,
  ) {}

  async execute(
    organizationId: string,
    filters: AnalyticsFiltersDto,
  ): Promise<ExecutiveDashboardDto> {
    const context = await resolveFilteredContext(
      this.resolveDataset,
      this.customerAnalytics,
      organizationId,
      filters,
    );

    const cacheKey = buildAnalyticsCacheKey(context.datasetVersionId, CACHE_SCOPE, filters);
    const cached = this.cache.get<ExecutiveDashboardDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const pureSummary = this.kpiEngine.computeSummary(context.rows, context.columns);
    const topProducts = this.productAnalytics.getTopProducts(
      context.rows,
      context.columns,
      TOP_PRODUCTS_LIMIT,
    );
    const inventory = this.inventoryAnalytics.build(context.rows, context.columns);

    const kpis: KpiSummaryDto = {
      ...pureSummary,
      topProducts,
      inventoryTurnover: inventory.inventoryTurnover,
    };

    const dashboard: ExecutiveDashboardDto = {
      kpis,
      monthlyRevenueTrend: this.timeSeries.monthlyRevenueTrend(context.rows, context.columns),
      ordersOverTime: this.timeSeries.ordersOverTime(context.rows, context.columns),
      revenueByCategory: this.aggregation.revenueByCategory(context.rows, context.columns),
      revenueByRegion: this.aggregation.revenueByRegion(context.rows, context.columns),
      topProduct: topProducts[0] ?? null,
      inventoryStatus:
        inventory.totalSkus > 0
          ? {
              totalSkus: inventory.totalSkus,
              lowStockCount: inventory.lowStockProducts.length,
              overstockCount: inventory.overstockProducts.length,
              totalInventoryValue: inventory.totalInventoryValue,
            }
          : null,
      lowStockAlerts: inventory.lowStockProducts
        .slice()
        .sort((a, b) => a.stockLevel - b.stockLevel)
        .slice(0, LOW_STOCK_ALERT_LIMIT)
        .map((product) => ({
          productId: product.productId,
          productName: product.productName,
          stockLevel: product.stockLevel,
          reorderLevel: product.reorderLevel,
        })),
      generatedAt: new Date().toISOString(),
      datasetId: context.datasetId,
      datasetVersionId: context.datasetVersionId,
    };

    this.cache.set(cacheKey, dashboard);
    return dashboard;
  }
}
