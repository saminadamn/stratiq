import type { MlModelKey } from '@stratiq/shared';
import type { Prediction } from '../entities/prediction.entity.js';

export interface CreatePredictionInput {
  organizationId: string;
  datasetVersionId: string;
  modelKey: MlModelKey;
  modelVersion: number;
  targetType: string | null;
  targetId: string | null;
  valueJson: Record<string, unknown>;
  confidence: number;
  explanationJson: Record<string, unknown>;
}

export interface PredictionRepository {
  createMany(inputs: CreatePredictionInput[]): Promise<void>;
  findByDatasetVersion(datasetVersionId: string, modelKey: MlModelKey): Promise<Prediction[]>;
}
