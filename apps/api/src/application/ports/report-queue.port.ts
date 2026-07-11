import type { ReportType } from '@stratiq/shared';

export interface ReportJobPayload {
  reportId: string;
  organizationId: string;
  generatedById: string;
  type: ReportType;
  datasetId?: string;
}

// Queue port — the HTTP request path only ever enqueues; a worker (embedded
// in this process or standalone, see composition-root.ts's createWorker)
// consumes the same queue and does the actual PDF generation via
// ProcessReportJobService. Two implementations: BullMqReportQueue (Redis)
// and InProcessReportQueue (no Redis configured) — both give the controller
// an identical enqueue-and-return-202 contract.
export interface ReportQueue {
  enqueue(payload: ReportJobPayload): Promise<void>;
}
