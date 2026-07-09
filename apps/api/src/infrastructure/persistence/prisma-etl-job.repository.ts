import type { PrismaClient } from '@prisma/client';
import type { EtlJobStatus, EtlLogLevel } from '@stratiq/shared';
import type { EtlJobWithLogs } from '../../domain/entities/etl-job.entity.js';
import type { EtlJobRepository } from '../../domain/repositories/etl-job.repository.js';

export class PrismaEtlJobRepository implements EtlJobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(datasetVersionId: string): Promise<EtlJobWithLogs> {
    return this.prisma.etlJob.create({
      data: { datasetVersionId },
      include: { logs: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async updateStatus(
    id: string,
    status: EtlJobStatus,
    options?: { completedAt?: Date; errorMessage?: string },
  ): Promise<void> {
    // Built conditionally rather than passing `completedAt: options?.completedAt`
    // directly — Prisma's input types (with exactOptionalPropertyTypes) treat an
    // explicit `undefined` value differently from an omitted key.
    await this.prisma.etlJob.update({
      where: { id },
      data: {
        status,
        ...(options?.completedAt !== undefined ? { completedAt: options.completedAt } : {}),
        ...(options?.errorMessage !== undefined ? { errorMessage: options.errorMessage } : {}),
      },
    });
  }

  async appendLog(
    etlJobId: string,
    entry: { stage: string; level: EtlLogLevel; message: string },
  ): Promise<void> {
    await this.prisma.etlLog.create({ data: { etlJobId, ...entry } });
  }

  async findByDatasetVersion(datasetVersionId: string): Promise<EtlJobWithLogs | null> {
    return this.prisma.etlJob.findFirst({
      where: { datasetVersionId },
      orderBy: { startedAt: 'desc' },
      include: { logs: { orderBy: { createdAt: 'asc' } } },
    });
  }
}
