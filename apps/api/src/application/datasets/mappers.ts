import type {
  ColumnSchemaDto,
  DatasetDto,
  DatasetVersionDto,
  EtlJobSummaryDto,
  FeatureSetDto,
  ValidationReportDto,
} from '@stratiq/shared';
import type { ColumnSchema } from '../../domain/entities/column-schema.entity.js';
import type { Dataset } from '../../domain/entities/dataset.entity.js';
import type { DatasetVersionWithRelations } from '../../domain/entities/dataset-version.entity.js';
import type { EtlJobWithLogs } from '../../domain/entities/etl-job.entity.js';
import type { FeatureSet } from '../../domain/entities/feature-set.entity.js';
import type { ValidationReport } from '../../domain/entities/validation-report.entity.js';

export function toColumnSchemaDto(schema: ColumnSchema[]): ColumnSchemaDto[] {
  return schema.map((column) => ({
    name: column.name,
    type: column.type,
    nullable: column.nullable,
  }));
}

export function toDatasetVersionDto(version: DatasetVersionWithRelations): DatasetVersionDto {
  return {
    id: version.id,
    versionNumber: version.versionNumber,
    rowCount: version.rowCount,
    columnCount: version.columnCount,
    schema: toColumnSchemaDto(version.schema),
    qualityScore: version.qualityScore,
    cleaningMode: version.cleaningMode,
    processingTimeMs: version.processingTimeMs,
    createdAt: version.createdAt.toISOString(),
    createdBy: version.createdBy,
    originalFileName: version.uploadedFile?.originalFileName ?? null,
    fileSizeBytes: version.uploadedFile?.fileSizeBytes ?? null,
  };
}

export function toDatasetDto(
  dataset: Dataset,
  latestVersion: DatasetVersionWithRelations | null,
  versionCount: number,
): DatasetDto {
  return {
    id: dataset.id,
    name: dataset.name,
    status: dataset.status,
    createdAt: dataset.createdAt.toISOString(),
    updatedAt: dataset.updatedAt.toISOString(),
    versionCount,
    latestVersion: latestVersion ? toDatasetVersionDto(latestVersion) : null,
  };
}

export function toValidationReportDto(report: ValidationReport): ValidationReportDto {
  return {
    rowCount: report.rowCount,
    columnCount: report.columnCount,
    issues: report.issues,
    qualityScore: report.qualityScore,
  };
}

export function toFeatureSetDto(
  featureSet: FeatureSet | { name: string; label: string; value: unknown },
): FeatureSetDto {
  return { name: featureSet.name, label: featureSet.label, value: featureSet.value };
}

export function toEtlJobSummaryDto(job: EtlJobWithLogs): EtlJobSummaryDto {
  return {
    status: job.status,
    startedAt: job.startedAt.toISOString(),
    completedAt: job.completedAt ? job.completedAt.toISOString() : null,
    errorMessage: job.errorMessage,
    logs: job.logs.map((entry) => ({
      stage: entry.stage,
      level: entry.level,
      message: entry.message,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}
