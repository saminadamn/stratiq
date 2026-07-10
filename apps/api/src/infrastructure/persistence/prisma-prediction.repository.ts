import type { Prisma, MlModelKey as PrismaMlModelKey, PrismaClient } from '@prisma/client';
import type { MlModelKey } from '@stratiq/shared';
import type { Prediction } from '../../domain/entities/prediction.entity.js';
import type {
  CreatePredictionInput,
  PredictionRepository,
} from '../../domain/repositories/prediction.repository.js';

type PredictionRow = Prisma.PredictionGetPayload<Record<string, never>>;

function toDomain(row: PredictionRow): Prediction {
  return {
    id: row.id,
    organizationId: row.organizationId,
    datasetVersionId: row.datasetVersionId,
    modelKey: row.modelKey as MlModelKey,
    modelVersion: row.modelVersion,
    targetType: row.targetType,
    targetId: row.targetId,
    valueJson: row.valueJson as Record<string, unknown>,
    confidence: row.confidence,
    explanationJson: row.explanationJson as Record<string, unknown>,
    createdAt: row.createdAt,
  };
}

export class PrismaPredictionRepository implements PredictionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createMany(inputs: CreatePredictionInput[]): Promise<void> {
    if (inputs.length === 0) {
      return;
    }
    await this.prisma.prediction.createMany({
      data: inputs.map((input) => ({
        organizationId: input.organizationId,
        datasetVersionId: input.datasetVersionId,
        modelKey: input.modelKey as PrismaMlModelKey,
        modelVersion: input.modelVersion,
        targetType: input.targetType,
        targetId: input.targetId,
        valueJson: input.valueJson as Prisma.InputJsonValue,
        confidence: input.confidence,
        explanationJson: input.explanationJson as Prisma.InputJsonValue,
      })),
    });
  }

  async findByDatasetVersion(
    datasetVersionId: string,
    modelKey: MlModelKey,
  ): Promise<Prediction[]> {
    const rows = await this.prisma.prediction.findMany({
      where: { datasetVersionId, modelKey: modelKey as PrismaMlModelKey },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toDomain);
  }
}
