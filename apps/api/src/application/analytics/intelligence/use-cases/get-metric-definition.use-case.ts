import type { MetricDefinitionDto } from '@stratiq/shared';
import { toMetricDefinitionDto } from '../mappers.js';
import type { MetricsRegistryService } from '../metrics-registry.service.js';

export class GetMetricDefinitionUseCase {
  constructor(private readonly metricsRegistry: MetricsRegistryService) {}

  async execute(key: string): Promise<MetricDefinitionDto> {
    const metric = await this.metricsRegistry.getByKey(key);
    return toMetricDefinitionDto(metric);
  }
}
