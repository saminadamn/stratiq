import type { MetricCategory, MetricRefreshPolicy, MetricUnit } from '@stratiq/shared';

export interface MetricDefinition {
  id: string;
  key: string;
  name: string;
  description: string;
  category: MetricCategory;
  formula: string;
  unit: MetricUnit;
  owner: string;
  refreshPolicy: MetricRefreshPolicy;
  createdAt: Date;
  updatedAt: Date;
}
