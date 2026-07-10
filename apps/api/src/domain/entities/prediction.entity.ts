import type { MlModelKey } from '@stratiq/shared';

export interface Prediction {
  id: string;
  organizationId: string;
  datasetVersionId: string;
  modelKey: MlModelKey;
  modelVersion: number;
  targetType: string | null;
  targetId: string | null;
  valueJson: Record<string, unknown>;
  confidence: number;
  explanationJson: Record<string, unknown>;
  createdAt: Date;
}
