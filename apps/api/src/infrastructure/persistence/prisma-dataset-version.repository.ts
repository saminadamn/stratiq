import { Prisma, type PrismaClient } from '@prisma/client';
import type { ColumnSchema } from '../../domain/entities/column-schema.entity.js';
import type {
  CleaningLogEntry,
  DatasetVersion,
  DatasetVersionWithRelations,
} from '../../domain/entities/dataset-version.entity.js';
import type { ValidationReport } from '../../domain/entities/validation-report.entity.js';
import type {
  CreateDatasetVersionInput,
  DatasetVersionRepository,
} from '../../domain/repositories/dataset-version.repository.js';

const VERSION_INCLUDE = {
  createdBy: { select: { id: true, name: true } },
  uploadedFile: { select: { originalFileName: true, fileSizeBytes: true } },
} satisfies Prisma.DatasetVersionInclude;

type VersionRow = Prisma.DatasetVersionGetPayload<{ include: typeof VERSION_INCLUDE }>;

function toDomain(row: VersionRow): DatasetVersionWithRelations {
  return {
    id: row.id,
    datasetId: row.datasetId,
    versionNumber: row.versionNumber,
    uploadedFileId: row.uploadedFileId,
    rowCount: row.rowCount,
    columnCount: row.columnCount,
    schema: row.schema as unknown as ColumnSchema[],
    qualityScore: row.qualityScore,
    validationReport: row.validationReport as unknown as ValidationReport | null,
    cleaningMode: row.cleaningMode,
    cleaningLog: row.cleaningLog as unknown as CleaningLogEntry[] | null,
    processingTimeMs: row.processingTimeMs,
    createdById: row.createdById,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    uploadedFile: row.uploadedFile,
  };
}

export class PrismaDatasetVersionRepository implements DatasetVersionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateDatasetVersionInput): Promise<DatasetVersion> {
    const row = await this.prisma.datasetVersion.create({
      data: {
        datasetId: input.datasetId,
        versionNumber: input.versionNumber,
        uploadedFileId: input.uploadedFileId,
        rowCount: input.rowCount,
        columnCount: input.columnCount,
        schema: input.schema as unknown as Prisma.InputJsonValue,
        qualityScore: input.qualityScore,
        // Prisma requires the Prisma.JsonNull sentinel (not plain `null`) to
        // store an actual SQL NULL in a nullable JSON column.
        validationReport:
          input.validationReport === null
            ? Prisma.JsonNull
            : (input.validationReport as unknown as Prisma.InputJsonValue),
        cleaningMode: input.cleaningMode,
        cleaningLog:
          input.cleaningLog === null
            ? Prisma.JsonNull
            : (input.cleaningLog as unknown as Prisma.InputJsonValue),
        processingTimeMs: input.processingTimeMs,
        createdById: input.createdById,
      },
    });

    return {
      ...row,
      schema: row.schema as unknown as ColumnSchema[],
      validationReport: row.validationReport as unknown as ValidationReport | null,
      cleaningLog: row.cleaningLog as unknown as CleaningLogEntry[] | null,
    };
  }

  async findById(id: string): Promise<DatasetVersionWithRelations | null> {
    const row = await this.prisma.datasetVersion.findUnique({
      where: { id },
      include: VERSION_INCLUDE,
    });
    return row ? toDomain(row) : null;
  }

  async findLatestByDataset(datasetId: string): Promise<DatasetVersionWithRelations | null> {
    const row = await this.prisma.datasetVersion.findFirst({
      where: { datasetId },
      orderBy: { versionNumber: 'desc' },
      include: VERSION_INCLUDE,
    });
    return row ? toDomain(row) : null;
  }

  async listByDataset(datasetId: string): Promise<DatasetVersionWithRelations[]> {
    const rows = await this.prisma.datasetVersion.findMany({
      where: { datasetId },
      orderBy: { versionNumber: 'asc' },
      include: VERSION_INCLUDE,
    });
    return rows.map(toDomain);
  }

  async countByDataset(datasetId: string): Promise<number> {
    return this.prisma.datasetVersion.count({ where: { datasetId } });
  }

  async nextVersionNumber(datasetId: string): Promise<number> {
    const latest = await this.prisma.datasetVersion.findFirst({
      where: { datasetId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    return (latest?.versionNumber ?? 0) + 1;
  }
}
