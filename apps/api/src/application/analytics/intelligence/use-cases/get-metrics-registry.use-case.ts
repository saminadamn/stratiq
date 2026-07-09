import type { MetricDefinitionDto } from '@stratiq/shared';
import { toMetricDefinitionDto } from '../mappers.js';
import type { MetricsRegistryService } from '../metrics-registry.service.js';

export class GetMetricsRegistryUseCase {
  constructor(private readonly metricsRegistry: MetricsRegistryService) {}

  async execute(): Promise<MetricDefinitionDto[]> {
    const metrics = await this.metricsRegistry.list();
    return metrics.map(toMetricDefinitionDto);
  }
}
