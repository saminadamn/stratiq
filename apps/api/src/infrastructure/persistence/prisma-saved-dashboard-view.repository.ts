import type { Prisma, PrismaClient } from '@prisma/client';
import type { AnalyticsFiltersDto, DashboardType } from '@stratiq/shared';
import type { SavedDashboardViewWithCreator } from '../../domain/entities/saved-dashboard-view.entity.js';
import type {
  CreateSavedDashboardViewInput,
  SavedDashboardViewRepository,
  UpdateSavedDashboardViewInput,
} from '../../domain/repositories/saved-dashboard-view.repository.js';

const VIEW_INCLUDE = {
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.SavedDashboardViewInclude;

type ViewRow = Prisma.SavedDashboardViewGetPayload<{ include: typeof VIEW_INCLUDE }>;

function toDomain(row: ViewRow): SavedDashboardViewWithCreator {
  return {
    id: row.id,
    organizationId: row.organizationId,
    createdById: row.createdById,
    name: row.name,
    dashboardType: row.dashboardType,
    filters: row.filters as unknown as AnalyticsFiltersDto,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
  };
}

export class PrismaSavedDashboardViewRepository implements SavedDashboardViewRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateSavedDashboardViewInput): Promise<SavedDashboardViewWithCreator> {
    const row = await this.prisma.savedDashboardView.create({
      data: {
        organizationId: input.organizationId,
        createdById: input.createdById,
        name: input.name,
        dashboardType: input.dashboardType,
        filters: input.filters as unknown as Prisma.InputJsonValue,
      },
      include: VIEW_INCLUDE,
    });
    return toDomain(row);
  }

  async findByOrganizationAndId(
    organizationId: string,
    id: string,
  ): Promise<SavedDashboardViewWithCreator | null> {
    const row = await this.prisma.savedDashboardView.findFirst({
      where: { id, organizationId },
      include: VIEW_INCLUDE,
    });
    return row ? toDomain(row) : null;
  }

  async listByOrganization(
    organizationId: string,
    dashboardType?: DashboardType,
  ): Promise<SavedDashboardViewWithCreator[]> {
    const rows = await this.prisma.savedDashboardView.findMany({
      where: { organizationId, ...(dashboardType ? { dashboardType } : {}) },
      include: VIEW_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDomain);
  }

  async update(
    id: string,
    input: UpdateSavedDashboardViewInput,
  ): Promise<SavedDashboardViewWithCreator> {
    const row = await this.prisma.savedDashboardView.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.filters !== undefined
          ? { filters: input.filters as unknown as Prisma.InputJsonValue }
          : {}),
      },
      include: VIEW_INCLUDE,
    });
    return toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.savedDashboardView.delete({ where: { id } });
  }
}
