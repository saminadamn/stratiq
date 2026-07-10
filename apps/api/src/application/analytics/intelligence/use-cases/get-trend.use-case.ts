import type { TrendAnalysisDto } from '@stratiq/shared';
import { MetricNotComputableError } from '../../../../domain/errors/intelligence-error.js';
import type { InventoryAnalyticsService } from '../../inventory-analytics.service.js';
import type { ResolveAnalyticsDatasetService } from '../../resolve-analytics-dataset.service.js';
import { buildMetricCalculators } from '../metric-calculators.js';
import { computeMetricMonthlySeries } from '../metric-time-series.js';
import type { MetricsRegistryService } from '../metrics-registry.service.js';
import type { TrendDetectionService } from '../trend-detection.service.js';

export class GetTrendUseCase {
  constructor(
    private readonly resolveDataset: ResolveAnalyticsDatasetService,
    private readonly metricsRegistry: MetricsRegistryService,
    private readonly inventoryAnalytics: InventoryAnalyticsService,
    private readonly trendDetection: TrendDetectionService,
  ) {}

  async execute(
    organizationId: string,
    metricKey: string,
    datasetId?: string,
  ): Promise<TrendAnalysisDto> {
    await this.metricsRegistry.getByKey(metricKey);
    const context = await this.resolveDataset.resolve(organizationId, datasetId);
    const calculator = buildMetricCalculators(this.inventoryAnalytics)[metricKey];
    if (!calculator) {
      throw new MetricNotComputableError();
    }

    const series = computeMetricMonthlySeries(context.rows, context.columns, calculator);
    const result = this.trendDetection.analyze(series);

    return {
      metricKey,
      direction: result.direction,
      averageChangePercent: result.averageChangePercent,
      series,
      outliers: result.outliers,
    };
  }
}
