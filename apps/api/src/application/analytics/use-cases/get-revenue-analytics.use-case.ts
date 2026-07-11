import type { AnalyticsFiltersDto, RevenueAnalyticsDto } from '@stratiq/shared';
import type { AnalyticsCache } from '../../ports/analytics-cache.port.js';
import type { AggregationService } from '../aggregation.service.js';
import { buildAnalyticsCacheKey } from '../cache-key.js';
import type { CustomerAnalyticsService } from '../customer-analytics.service.js';
import { calculateRevenue } from '../kpis/revenue.kpi.js';
import { resolveFilteredContext } from '../resolve-filtered-context.js';
import type { ResolveAnalyticsDatasetService } from '../resolve-analytics-dataset.service.js';
import type { TimeSeriesService } from '../time-series.service.js';

const CACHE_SCOPE = 'revenue';

export class GetRevenueAnalyticsUseCase {
  constructor(
    private readonly resolveDataset: ResolveAnalyticsDatasetService,
    private readonly customerAnalytics: CustomerAnalyticsService,
    private readonly timeSeries: TimeSeriesService,
    private readonly aggregation: AggregationService,
    private readonly cache: AnalyticsCache,
  ) {}

  async execute(
    organizationId: string,
    filters: AnalyticsFiltersDto,
  ): Promise<RevenueAnalyticsDto> {
    const context = await resolveFilteredContext(
      this.resolveDataset,
      this.customerAnalytics,
      organizationId,
      filters,
    );

    const cacheKey = buildAnalyticsCacheKey(context.datasetVersionId, CACHE_SCOPE, filters);
    const cached = await this.cache.get<RevenueAnalyticsDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const result: RevenueAnalyticsDto = {
      totalRevenue: calculateRevenue(context.rows, context.columns),
      monthlyRevenueTrend: this.timeSeries.monthlyRevenueTrend(context.rows, context.columns),
      revenueByCategory: this.aggregation.revenueByCategory(context.rows, context.columns),
      revenueByRegion: this.aggregation.revenueByRegion(context.rows, context.columns),
      generatedAt: new Date().toISOString(),
      datasetId: context.datasetId,
      datasetVersionId: context.datasetVersionId,
    };
    await this.cache.set(cacheKey, result);
    return result;
  }
}
