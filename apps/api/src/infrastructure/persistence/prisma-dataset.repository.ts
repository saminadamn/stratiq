import type { PrismaClient } from '@prisma/client';
import type { DatasetStatus } from '@stratiq/shared';
import type { Dataset } from '../../domain/entities/dataset.entity.js';
import type { DatasetRepository } from '../../domain/repositories/dataset.repository.js';

export class PrismaDatasetRepository implements DatasetRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: {
    organizationId: string;
    name: string;
    createdById: string;
  }): Promise<Dataset> {
    return this.prisma.dataset.create({ data: input });
  }

  async findById(id: string): Promise<Dataset | null> {
    return this.prisma.dataset.findUnique({ where: { id } });
  }

  async findByOrganizationAndId(organizationId: string, id: string): Promise<Dataset | null> {
    return this.prisma.dataset.findFirst({ where: { id, organizationId } });
  }

  async listByOrganization(organizationId: string): Promise<Dataset[]> {
    return this.prisma.dataset.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: DatasetStatus): Promise<void> {
    await this.prisma.dataset.update({ where: { id }, data: { status } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.dataset.delete({ where: { id } });
  }
}
