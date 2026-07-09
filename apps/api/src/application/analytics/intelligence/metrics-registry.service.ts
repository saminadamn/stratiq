import type { MetricDefinition } from '../../../domain/entities/metric-definition.entity.js';
import { MetricNotFoundError } from '../../../domain/errors/intelligence-error.js';
import type { MetricDefinitionRepository } from '../../../domain/repositories/metric-definition.repository.js';

// The discovery API for the Metrics Registry — every KPI/metric the platform
// knows about, with its metadata (see MetricDefinition). This is the piece
// dashboards, the Insight Engine, and (eventually) ML pipelines can all read
// from to agree on what a metric means, instead of each defining it separately.
export class MetricsRegistryService {
  constructor(private readonly metricDefinitions: MetricDefinitionRepository) {}

  async list(): Promise<MetricDefinition[]> {
    return this.metricDefinitions.listAll();
  }

  async getByKey(key: string): Promise<MetricDefinition> {
    const metric = await this.metricDefinitions.findByKey(key);
    if (!metric) {
      throw new MetricNotFoundError();
    }
    return metric;
  }
}
