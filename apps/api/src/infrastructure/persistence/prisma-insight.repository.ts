import { Prisma, type PrismaClient } from '@prisma/client';
import type { Insight } from '../../domain/entities/insight.entity.js';
import type {
  CreateInsightInput,
  InsightRepository,
} from '../../domain/repositories/insight.repository.js';

type InsightRow = Prisma.InsightGetPayload<Record<string, never>>;

function toDomain(row: InsightRow): Insight {
  return {
    id: row.id,
    organizationId: row.organizationId,
    datasetVersionId: row.datasetVersionId,
    metricKey: row.metricKey,
    title: row.title,
    narrative: row.narrative,
    trend: row.trend,
    severity: row.severity,
    currentValue: row.currentValue,
    previousValue: row.previousValue,
    changePercent: row.changePercent,
    metadata: row.metadata as Record<string, unknown> | null,
    createdAt: row.createdAt,
  };
}

export class PrismaInsightRepository implements InsightRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateInsightInput): Promise<Insight> {
    const row = await this.prisma.insight.create({
      data: {
        organizationId: input.organizationId,
        datasetVersionId: input.datasetVersionId,
        metricKey: input.metricKey,
        title: input.title,
        narrative: input.narrative,
        trend: input.trend,
        severity: input.severity,
        currentValue: input.currentValue,
        previousValue: input.previousValue,
        changePercent: input.changePercent,
        metadata:
          input.metadata === null ? Prisma.JsonNull : (input.metadata as Prisma.InputJsonValue),
      },
    });
    return toDomain(row);
  }

  async countByDatasetVersion(datasetVersionId: string): Promise<number> {
    return this.prisma.insight.count({ where: { datasetVersionId } });
  }

  async listByOrganization(organizationId: string, limit: number): Promise<Insight[]> {
    const rows = await this.prisma.insight.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map(toDomain);
  }

  async findByDatasetVersion(datasetVersionId: string): Promise<Insight[]> {
    const rows = await this.prisma.insight.findMany({
      where: { datasetVersionId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toDomain);
  }
}
