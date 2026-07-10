import type { Prisma, PrismaClient } from '@prisma/client';
import type { MlFeatureSnapshot } from '../../domain/entities/ml-feature-snapshot.entity.js';
import type {
  CreateMlFeatureSnapshotInput,
  MlFeatureSnapshotRepository,
} from '../../domain/repositories/ml-feature-snapshot.repository.js';

type SnapshotRow = Prisma.MlFeatureSnapshotGetPayload<Record<string, never>>;

function toDomain(row: SnapshotRow): MlFeatureSnapshot {
  return {
    id: row.id,
    organizationId: row.organizationId,
    datasetVersionId: row.datasetVersionId,
    entityType: row.entityType,
    entityId: row.entityId,
    featuresJson: row.featuresJson as Record<string, unknown>,
    computedAt: row.computedAt,
  };
}

export class PrismaMlFeatureSnapshotRepository implements MlFeatureSnapshotRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async saveMany(inputs: CreateMlFeatureSnapshotInput[]): Promise<void> {
    if (inputs.length === 0) {
      return;
    }
    await this.prisma.mlFeatureSnapshot.createMany({
      data: inputs.map((input) => ({
        organizationId: input.organizationId,
        datasetVersionId: input.datasetVersionId,
        entityType: input.entityType,
        entityId: input.entityId,
        featuresJson: input.featuresJson as Prisma.InputJsonValue,
      })),
      skipDuplicates: true,
    });
  }

  async findByDatasetVersion(
    datasetVersionId: string,
    entityType: string,
  ): Promise<MlFeatureSnapshot[]> {
    const rows = await this.prisma.mlFeatureSnapshot.findMany({
      where: { datasetVersionId, entityType },
    });
    return rows.map(toDomain);
  }
}
