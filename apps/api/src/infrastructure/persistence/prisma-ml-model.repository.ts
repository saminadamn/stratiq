import type { Prisma, MlModelKey as PrismaMlModelKey, PrismaClient } from '@prisma/client';
import type { MlModelKey } from '@stratiq/shared';
import type { MlModel } from '../../domain/entities/ml-model.entity.js';
import type { CreateMlModelInput, MlModelRepository } from '../../domain/repositories/ml-model.repository.js';

type MlModelRow = Prisma.MlModelGetPayload<Record<string, never>>;

function toDomain(row: MlModelRow): MlModel {
  return {
    id: row.id,
    organizationId: row.organizationId,
    datasetVersionId: row.datasetVersionId,
    modelKey: row.modelKey as MlModelKey,
    version: row.version,
    algorithm: row.algorithm,
    metricsJson: row.metricsJson as Record<string, unknown>,
    artifactPath: row.artifactPath,
    isActive: row.isActive,
    trainedAt: row.trainedAt,
  };
}

export class PrismaMlModelRepository implements MlModelRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsert(input: CreateMlModelInput): Promise<MlModel> {
    // A single atomic upsert on the @@unique([organizationId, datasetVersionId,
    // modelKey]) constraint — this is the DB-level guard, not an in-process
    // lock (see docs/ARCHITECTURE.md's Sprint 4 lock retrofit). It also
    // correctly handles forceRetrain: a second train for the same dataset
    // version updates this row to the ML service's new version/metrics
    // instead of leaving a stale one behind.
    const row = await this.prisma.mlModel.upsert({
      where: {
        organizationId_datasetVersionId_modelKey: {
          organizationId: input.organizationId,
          datasetVersionId: input.datasetVersionId,
          modelKey: input.modelKey as PrismaMlModelKey,
        },
      },
      create: {
        organizationId: input.organizationId,
        datasetVersionId: input.datasetVersionId,
        modelKey: input.modelKey as PrismaMlModelKey,
        version: input.version,
        algorithm: input.algorithm,
        metricsJson: input.metricsJson as Prisma.InputJsonValue,
        artifactPath: input.artifactPath,
      },
      update: {
        version: input.version,
        algorithm: input.algorithm,
        metricsJson: input.metricsJson as Prisma.InputJsonValue,
        artifactPath: input.artifactPath,
        trainedAt: new Date(),
      },
    });
    return toDomain(row);
  }

  async findByDatasetVersion(datasetVersionId: string, modelKey: MlModelKey): Promise<MlModel | null> {
    // datasetVersionId is already unique per dataset (and a dataset belongs
    // to exactly one organization), so this is unambiguous without also
    // filtering by organizationId.
    const row = await this.prisma.mlModel.findFirst({
      where: { datasetVersionId, modelKey: modelKey as PrismaMlModelKey },
    });
    return row ? toDomain(row) : null;
  }
}
