import type { ReportStatus, ReportType } from '@stratiq/shared';
import type { Report } from '../entities/report.entity.js';

export interface CreateReportInput {
  organizationId: string;
  datasetVersionId: string;
  type: ReportType;
  status: ReportStatus;
  generatedById: string;
}

export interface UpdateReportStatusInput {
  status: ReportStatus;
  fileName?: string;
  storagePath?: string;
  errorMessage?: string;
  completedAt?: Date;
}

export interface ReportRepository {
  create(input: CreateReportInput): Promise<Report>;
  updateStatus(id: string, input: UpdateReportStatusInput): Promise<Report>;
  listByOrganization(organizationId: string): Promise<Report[]>;
  findByOrganizationAndId(organizationId: string, id: string): Promise<Report | null>;
  // Recovers reports orphaned by a process restart mid-job (the in-process
  // embedded queue has no durable retry — see InProcessReportQueue). Marks
  // anything still PENDING/PROCESSING older than the cutoff as FAILED so the
  // UI shows a clear, actionable state instead of an indefinitely disabled
  // Download button. Returns the number of rows updated.
  markStaleAsFailed(olderThanMinutes: number): Promise<number>;
}
