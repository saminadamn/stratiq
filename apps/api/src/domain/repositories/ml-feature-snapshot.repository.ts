import type { MlFeatureSnapshot } from '../entities/ml-feature-snapshot.entity.js';

export interface CreateMlFeatureSnapshotInput {
  organizationId: string;
  datasetVersionId: string;
  entityType: string;
  entityId: string;
  featuresJson: Record<string, unknown>;
}

export interface MlFeatureSnapshotRepository {
  // Uses INSERT ... ON CONFLICT DO NOTHING under the hood (backed by the
  // @@unique([organizationId, datasetVersionId, entityType, entityId])
  // constraint) — a DB-level guard, not an in-process lock, so two
  // concurrent requests computing the same snapshots race harmlessly instead
  // of double-writing (see docs/ARCHITECTURE.md's Sprint 4 lock retrofit).
  saveMany(inputs: CreateMlFeatureSnapshotInput[]): Promise<void>;
  findByDatasetVersion(datasetVersionId: string, entityType: string): Promise<MlFeatureSnapshot[]>;
}
