import type { AlertStatus, Prisma, PrismaClient } from '@prisma/client';
import type { Alert } from '../../domain/entities/alert.entity.js';
import type {
  AlertRepository,
  CreateAlertInput,
} from '../../domain/repositories/alert.repository.js';

type AlertRow = Prisma.AlertGetPayload<Record<string, never>>;

function toDomain(row: AlertRow): Alert {
  return {
    id: row.id,
    organizationId: row.organizationId,
    datasetVersionId: row.datasetVersionId,
    metricKey: row.metricKey,
    ruleId: row.ruleId,
    severity: row.severity,
    message: row.message,
    currentValue: row.currentValue,
    thresholdValue: row.thresholdValue,
    status: row.status,
    createdAt: row.createdAt,
    resolvedAt: row.resolvedAt,
  };
}

export class PrismaAlertRepository implements AlertRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateAlertInput): Promise<Alert> {
    const row = await this.prisma.alert.create({
      data: {
        organizationId: input.organizationId,
        datasetVersionId: input.datasetVersionId,
        metricKey: input.metricKey,
        ruleId: input.ruleId,
        severity: input.severity,
        message: input.message,
        currentValue: input.currentValue,
        thresholdValue: input.thresholdValue,
      },
    });
    return toDomain(row);
  }

  async listByOrganization(organizationId: string, status?: AlertStatus): Promise<Alert[]> {
    const rows = await this.prisma.alert.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDomain);
  }

  async findByOrganizationAndId(organizationId: string, id: string): Promise<Alert | null> {
    const row = await this.prisma.alert.findFirst({ where: { id, organizationId } });
    return row ? toDomain(row) : null;
  }

  async updateStatus(id: string, status: AlertStatus, resolvedAt?: Date): Promise<Alert> {
    const row = await this.prisma.alert.update({
      where: { id },
      data: { status, resolvedAt: resolvedAt ?? null },
    });
    return toDomain(row);
  }

  async findByDatasetVersion(datasetVersionId: string): Promise<Alert[]> {
    const rows = await this.prisma.alert.findMany({
      where: { datasetVersionId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toDomain);
  }
}
