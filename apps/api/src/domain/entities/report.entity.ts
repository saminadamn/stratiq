import type { ReportStatus, ReportType } from '@stratiq/shared';

export interface Report {
  id: string;
  organizationId: string;
  datasetVersionId: string;
  type: ReportType;
  status: ReportStatus;
  // null until generation completes (PENDING/PROCESSING/FAILED).
  fileName: string | null;
  storagePath: string | null;
  errorMessage: string | null;
  generatedById: string;
  generatedByName: string;
  generatedAt: Date;
  completedAt: Date | null;
}
