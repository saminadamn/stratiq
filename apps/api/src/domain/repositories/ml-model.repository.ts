import type { MlModelKey } from '@stratiq/shared';
import type { MlModel } from '../entities/ml-model.entity.js';

export interface CreateMlModelInput {
  organizationId: string;
  datasetVersionId: string;
  modelKey: MlModelKey;
  version: number;
  algorithm: string;
  metricsJson: Record<string, unknown>;
  artifactPath: string;
}

export interface MlModelRepository {
  // Atomic upsert backed by @@unique([organizationId, datasetVersionId,
  // modelKey]) — the DB-level guard against duplicate training rows, and
  // also what makes forceRetrain update the existing row (new version,
  // metrics, artifact path) instead of leaving a stale one behind.
  upsert(input: CreateMlModelInput): Promise<MlModel>;
  findByDatasetVersion(datasetVersionId: string, modelKey: MlModelKey): Promise<MlModel | null>;
}
