import type { PrismaClient } from '@prisma/client';
import type { MetricDefinition } from '../../domain/entities/metric-definition.entity.js';
import type {
  MetricDefinitionRepository,
  UpsertMetricDefinitionInput,
} from '../../domain/repositories/metric-definition.repository.js';

export class PrismaMetricDefinitionRepository implements MetricDefinitionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertMany(inputs: UpsertMetricDefinitionInput[]): Promise<void> {
    for (const input of inputs) {
      await this.prisma.metricDefinition.upsert({
        where: { key: input.key },
        create: input,
        update: input,
      });
    }
  }

  async listAll(): Promise<MetricDefinition[]> {
    return this.prisma.metricDefinition.findMany({ orderBy: { name: 'asc' } });
  }

  async findByKey(key: string): Promise<MetricDefinition | null> {
    return this.prisma.metricDefinition.findUnique({ where: { key } });
  }
}
