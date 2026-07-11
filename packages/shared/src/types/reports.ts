export const REPORT_TYPES = ['EXECUTIVE_SUMMARY', 'KPI', 'PREDICTION', 'RECOMMENDATION'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

// v1.1 (Distributed Systems Showcase). Generation runs on a queue now (see
// docs/adr/0007-bullmq-job-queue.md) — a report exists as PENDING the
// moment it's requested, before a file is available.
export const REPORT_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETE', 'FAILED'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export interface GenerateReportRequestDto {
  type: ReportType;
  datasetId?: string | undefined;
}

export interface ReportDto {
  id: string;
  type: ReportType;
  status: ReportStatus;
  fileName: string | null;
  errorMessage: string | null;
  generatedAt: string;
  generatedBy: { id: string; name: string };
}
