import type { Prisma, PrismaClient } from '@prisma/client';
import type { FeatureSet } from '../../domain/entities/feature-set.entity.js';
import type {
  CreateFeatureSetInput,
  FeatureSetRepository,
} from '../../domain/repositories/feature-set.repository.js';

export class PrismaFeatureSetRepository implements FeatureSetRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createMany(inputs: CreateFeatureSetInput[]): Promise<void> {
    if (inputs.length === 0) {
      return;
    }
    await this.prisma.featureSet.createMany({
      data: inputs.map((input) => ({
        datasetVersionId: input.datasetVersionId,
        name: input.name,
        label: input.label,
        value: input.value as unknown as Prisma.InputJsonValue,
      })),
    });
  }

  async listByDatasetVersion(datasetVersionId: string): Promise<FeatureSet[]> {
    const rows = await this.prisma.featureSet.findMany({ where: { datasetVersionId } });
    return rows.map((row) => ({ ...row, value: row.value as unknown }));
  }
}
