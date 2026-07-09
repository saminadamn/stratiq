import type { FeatureSet } from '../entities/feature-set.entity.js';

export interface CreateFeatureSetInput {
  datasetVersionId: string;
  name: string;
  label: string;
  value: unknown;
}

export interface FeatureSetRepository {
  createMany(inputs: CreateFeatureSetInput[]): Promise<void>;
  listByDatasetVersion(datasetVersionId: string): Promise<FeatureSet[]>;
}
