import type { Prisma, PrismaClient } from '@prisma/client';
import type { BusinessRule } from '../../domain/entities/business-rule.entity.js';
import type {
  BusinessRuleRepository,
  CreateBusinessRuleInput,
  UpdateBusinessRuleInput,
} from '../../domain/repositories/business-rule.repository.js';

type BusinessRuleRow = Prisma.BusinessRuleGetPayload<Record<string, never>>;

function toDomain(row: BusinessRuleRow): BusinessRule {
  return {
    id: row.id,
    organizationId: row.organizationId,
    metricKey: row.metricKey,
    name: row.name,
    comparator: row.comparator,
    thresholdValue: row.thresholdValue,
    severity: row.severity,
    isActive: row.isActive,
    isDefault: row.isDefault,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaBusinessRuleRepository implements BusinessRuleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateBusinessRuleInput): Promise<BusinessRule> {
    const row = await this.prisma.businessRule.create({
      data: {
        organizationId: input.organizationId,
        metricKey: input.metricKey,
        name: input.name,
        comparator: input.comparator,
        thresholdValue: input.thresholdValue,
        severity: input.severity,
        isDefault: input.isDefault ?? false,
      },
    });
    return toDomain(row);
  }

  async createMany(inputs: CreateBusinessRuleInput[]): Promise<void> {
    await this.prisma.businessRule.createMany({
      data: inputs.map((input) => ({
        organizationId: input.organizationId,
        metricKey: input.metricKey,
        name: input.name,
        comparator: input.comparator,
        thresholdValue: input.thresholdValue,
        severity: input.severity,
        isDefault: input.isDefault ?? false,
      })),
    });
  }

  async listByOrganization(organizationId: string): Promise<BusinessRule[]> {
    const rows = await this.prisma.businessRule.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toDomain);
  }

  async findByOrganizationAndId(organizationId: string, id: string): Promise<BusinessRule | null> {
    const row = await this.prisma.businessRule.findFirst({ where: { id, organizationId } });
    return row ? toDomain(row) : null;
  }

  async update(id: string, input: UpdateBusinessRuleInput): Promise<BusinessRule> {
    const row = await this.prisma.businessRule.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.thresholdValue !== undefined ? { thresholdValue: input.thresholdValue } : {}),
        ...(input.severity !== undefined ? { severity: input.severity } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    return toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.businessRule.delete({ where: { id } });
  }

  async countByOrganization(organizationId: string): Promise<number> {
    return this.prisma.businessRule.count({ where: { organizationId } });
  }
}
