import type {
  Prisma,
  PrismaClient,
  ReportStatus as PrismaReportStatus,
  ReportType as PrismaReportType,
} from '@prisma/client';
import type { ReportStatus, ReportType } from '@stratiq/shared';
import type { Report } from '../../domain/entities/report.entity.js';
import type {
  CreateReportInput,
  ReportRepository,
  UpdateReportStatusInput,
} from '../../domain/repositories/report.repository.js';

const REPORT_INCLUDE = {
  generatedBy: { select: { id: true, name: true } },
} satisfies Prisma.ReportInclude;

type ReportRow = Prisma.ReportGetPayload<{ include: typeof REPORT_INCLUDE }>;

function toDomain(row: ReportRow): Report {
  return {
    id: row.id,
    organizationId: row.organizationId,
    datasetVersionId: row.datasetVersionId,
    type: row.type as ReportType,
    status: row.status as ReportStatus,
    fileName: row.fileName,
    storagePath: row.storagePath,
    errorMessage: row.errorMessage,
    generatedById: row.generatedById,
    generatedByName: row.generatedBy.name,
    generatedAt: row.generatedAt,
    completedAt: row.completedAt,
  };
}

export class PrismaReportRepository implements ReportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateReportInput): Promise<Report> {
    const row = await this.prisma.report.create({
      data: {
        organizationId: input.organizationId,
        datasetVersionId: input.datasetVersionId,
        type: input.type as PrismaReportType,
        status: input.status as PrismaReportStatus,
        generatedById: input.generatedById,
      },
      include: REPORT_INCLUDE,
    });
    return toDomain(row);
  }

  async updateStatus(id: string, input: UpdateReportStatusInput): Promise<Report> {
    const row = await this.prisma.report.update({
      where: { id },
      data: {
        status: input.status as PrismaReportStatus,
        ...(input.fileName !== undefined ? { fileName: input.fileName } : {}),
        ...(input.storagePath !== undefined ? { storagePath: input.storagePath } : {}),
        ...(input.errorMessage !== undefined ? { errorMessage: input.errorMessage } : {}),
        ...(input.completedAt !== undefined ? { completedAt: input.completedAt } : {}),
      },
      include: REPORT_INCLUDE,
    });
    return toDomain(row);
  }

  async listByOrganization(organizationId: string): Promise<Report[]> {
    const rows = await this.prisma.report.findMany({
      where: { organizationId },
      include: REPORT_INCLUDE,
      orderBy: { generatedAt: 'desc' },
    });
    return rows.map(toDomain);
  }

  async findByOrganizationAndId(organizationId: string, id: string): Promise<Report | null> {
    const row = await this.prisma.report.findFirst({
      where: { id, organizationId },
      include: REPORT_INCLUDE,
    });
    return row ? toDomain(row) : null;
  }
}
