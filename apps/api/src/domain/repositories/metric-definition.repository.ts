import type { MetricCategory, MetricRefreshPolicy, MetricUnit } from '@stratiq/shared';
import type { MetricDefinition } from '../entities/metric-definition.entity.js';

export interface UpsertMetricDefinitionInput {
  key: string;
  name: string;
  description: string;
  category: MetricCategory;
  formula: string;
  unit: MetricUnit;
  owner: string;
  refreshPolicy: MetricRefreshPolicy;
}

export interface MetricDefinitionRepository {
  // Idempotent by key — called at startup to seed/update the registry
  // without risking duplicate rows on every restart.
  upsertMany(inputs: UpsertMetricDefinitionInput[]): Promise<void>;
  listAll(): Promise<MetricDefinition[]>;
  findByKey(key: string): Promise<MetricDefinition | null>;
}
