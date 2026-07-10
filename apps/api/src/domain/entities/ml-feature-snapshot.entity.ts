export interface MlFeatureSnapshot {
  id: string;
  organizationId: string;
  datasetVersionId: string;
  entityType: string;
  entityId: string;
  featuresJson: Record<string, unknown>;
  computedAt: Date;
}
