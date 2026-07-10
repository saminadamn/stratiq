import type { MlModelKey } from '@stratiq/shared';

export interface MlModel {
  id: string;
  organizationId: string;
  datasetVersionId: string;
  modelKey: MlModelKey;
  version: number;
  algorithm: string;
  metricsJson: Record<string, unknown>;
  artifactPath: string;
  isActive: boolean;
  trainedAt: Date;
}
