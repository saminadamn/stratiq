import type { BenchmarkPeriod, BenchmarkResultDto } from '@stratiq/shared';
import { MetricNotComputableError } from '../../../../domain/errors/intelligence-error.js';
import type { InventoryAnalyticsService } from '../../inventory-analytics.service.js';
import type { ResolveAnalyticsDatasetService } from '../../resolve-analytics-dataset.service.js';
import type { BenchmarkEngineService } from '../benchmark-engine.service.js';
import { buildMetricCalculators } from '../metric-calculators.js';
import type { MetricsRegistryService } from '../metrics-registry.service.js';

export class GetBenchmarkUseCase {
  constructor(
    private readonly resolveDataset: ResolveAnalyticsDatasetService,
    private readonly metricsRegistry: MetricsRegistryService,
    private readonly inventoryAnalytics: InventoryAnalyticsService,
    private readonly benchmarkEngine: BenchmarkEngineService,
  ) {}

  async execute(
    organizationId: string,
    metricKey: string,
    period: BenchmarkPeriod,
    datasetId?: string,
  ): Promise<BenchmarkResultDto> {
    await this.metricsRegistry.getByKey(metricKey);
    const context = await this.resolveDataset.resolve(organizationId, datasetId);
    const calculator = buildMetricCalculators(this.inventoryAnalytics)[metricKey];
    if (!calculator) {
      throw new MetricNotComputableError();
    }

    const result = this.benchmarkEngine.compare(
      context.rows,
      context.columns,
      metricKey,
      calculator,
      period,
    );
    if (!result) {
      throw new MetricNotComputableError();
    }

    return result;
  }
}
