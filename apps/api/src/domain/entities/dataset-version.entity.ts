import type { CleaningMode } from '@stratiq/shared';
import type { ColumnSchema } from './column-schema.entity.js';
import type { ValidationReport } from './validation-report.entity.js';

export interface DatasetVersion {
  id: string;
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
  createdAt: Date;
}

// One applied cleaning transformation, recorded so users can see exactly what
// changed between versions (Sprint 2 requirement: "every transformation
// should be logged").
export interface CleaningLogEntry {
  operation: string;
  description: string;
  rowsAffected: number;
}

export interface DatasetVersionWithRelations extends DatasetVersion {
  createdBy: { id: string; name: string };
  uploadedFile: { originalFileName: string; fileSizeBytes: number } | null;
}
