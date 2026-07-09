// Mirrors the Prisma enums in apps/api/prisma/schema.prisma (Sprint 2 models).
// Kept as plain unions here for the same reason as `roles.ts`: the frontend
// never depends on `@prisma/client`.
export const DATASET_STATUSES = ['UPLOADING', 'PROCESSING', 'READY', 'FAILED'] as const;
export type DatasetStatus = (typeof DATASET_STATUSES)[number];

export const CLEANING_MODES = ['NONE', 'AUTOMATIC', 'MANUAL'] as const;
export type CleaningMode = (typeof CLEANING_MODES)[number];

export const SOURCE_FILE_TYPES = ['CSV', 'XLSX'] as const;
export type SourceFileType = (typeof SOURCE_FILE_TYPES)[number];

export const ETL_JOB_STATUSES = [
  'PENDING',
  'VALIDATING',
  'CLEANING',
  'TRANSFORMING',
  'FEATURE_ENGINEERING',
  'SAVING',
  'COMPLETED',
  'FAILED',
] as const;
export type EtlJobStatus = (typeof ETL_JOB_STATUSES)[number];

export const ETL_LOG_LEVELS = ['INFO', 'WARN', 'ERROR'] as const;
export type EtlLogLevel = (typeof ETL_LOG_LEVELS)[number];

export const COLUMN_TYPES = ['STRING', 'NUMBER', 'DATE', 'BOOLEAN'] as const;
export type ColumnType = (typeof COLUMN_TYPES)[number];

export const VALIDATION_SEVERITIES = ['INFO', 'WARNING', 'ERROR'] as const;
export type ValidationSeverity = (typeof VALIDATION_SEVERITIES)[number];

// One cleaning operation a user can pick in the manual cleaning wizard.
export const CLEANING_OPERATION_TYPES = [
  'REMOVE_DUPLICATES',
  'FILL_MISSING_VALUES',
  'CONVERT_DATA_TYPES',
  'STANDARDIZE_CATEGORIES',
  'TRIM_WHITESPACE',
  'REMOVE_INVALID_RECORDS',
] as const;
export type CleaningOperationType = (typeof CLEANING_OPERATION_TYPES)[number];

export interface ColumnSchemaDto {
  name: string;
  type: ColumnType;
  nullable: boolean;
}

export interface ValidationIssueDto {
  code: string;
  message: string;
  count: number;
  severity: ValidationSeverity;
  column?: string;
}

export interface ValidationReportDto {
  rowCount: number;
  columnCount: number;
  issues: ValidationIssueDto[];
  qualityScore: number;
}

export interface FeatureSetDto {
  name: string;
  label: string;
  value: unknown;
}

export interface EtlLogDto {
  stage: string;
  level: EtlLogLevel;
  message: string;
  createdAt: string;
}

export interface EtlJobSummaryDto {
  status: EtlJobStatus;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  logs: EtlLogDto[];
}

export interface DatasetVersionDto {
  id: string;
  versionNumber: number;
  rowCount: number;
  columnCount: number;
  schema: ColumnSchemaDto[];
  qualityScore: number | null;
  cleaningMode: CleaningMode;
  processingTimeMs: number | null;
  createdAt: string;
  createdBy: { id: string; name: string };
  originalFileName: string | null;
  fileSizeBytes: number | null;
}

export interface DatasetDto {
  id: string;
  name: string;
  status: DatasetStatus;
  createdAt: string;
  updatedAt: string;
  versionCount: number;
  latestVersion: DatasetVersionDto | null;
}

export interface DatasetPreviewDto {
  columns: ColumnSchemaDto[];
  rows: Array<Record<string, unknown>>;
  page: number;
  pageSize: number;
  totalRows: number;
}

export interface DatasetHistoryEntryDto {
  versionNumber: number;
  createdAt: string;
  createdBy: { id: string; name: string };
  rowCount: number;
  qualityScore: number | null;
  cleaningMode: CleaningMode;
  originalFileName: string | null;
}

export interface DatasetHistoryDto {
  dataset: { id: string; name: string };
  versions: DatasetHistoryEntryDto[];
}

export interface UploadDatasetResponseDto {
  dataset: DatasetDto;
  version: DatasetVersionDto;
  validationReport: ValidationReportDto;
  featureSets: FeatureSetDto[];
  etlJob: EtlJobSummaryDto;
}

export interface CleanDatasetRequestDto {
  mode: Extract<CleaningMode, 'AUTOMATIC' | 'MANUAL'>;
  // Required when mode is 'MANUAL'; ignored for 'AUTOMATIC' (which runs the
  // full fixed set of operations documented in docs/ARCHITECTURE.md).
  operations?: CleaningOperationType[] | undefined;
  // Defaults to the dataset's latest version if omitted.
  sourceVersionId?: string | undefined;
}
