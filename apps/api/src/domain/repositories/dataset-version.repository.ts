import type { CleaningMode } from '@stratiq/shared';
import type { ColumnSchema } from '../entities/column-schema.entity.js';
import type {
  CleaningLogEntry,
  DatasetVersion,
  DatasetVersionWithRelations,
} from '../entities/dataset-version.entity.js';
import type { ValidationReport } from '../entities/validation-report.entity.js';

export interface CreateDatasetVersionInput {
  datasetId: string;
  versionNumber: number;
  uploadedFileId: string | null;
  rowCount: number;
  columnCount: number;
  schema: ColumnSchema[];
  qualityScore: number | null;
  validationReport: ValidationReport | null;
  cleaningMode: CleaningMode;
  cleaningLog: CleaningLogEntry[] | null;
  processingTimeMs: number | null;
  createdById: string;
}

export interface DatasetVersionRepository {
  create(input: CreateDatasetVersionInput): Promise<DatasetVersion>;
  findById(id: string): Promise<DatasetVersionWithRelations | null>;
  findLatestByDataset(datasetId: string): Promise<DatasetVersionWithRelations | null>;
  listByDataset(datasetId: string): Promise<DatasetVersionWithRelations[]>;
  countByDataset(datasetId: string): Promise<number>;
  nextVersionNumber(datasetId: string): Promise<number>;
}
