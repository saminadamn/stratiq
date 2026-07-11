import type { ReportJobPayload, ReportQueue } from '../../application/ports/report-queue.port.js';
import type { ProcessReportJobService } from '../../application/analytics/reporting/process-report-job.service.js';
import type { Logger } from '../../application/ports/logger.port.js';

// No-Redis fallback: runs the same processing service the BullMQ worker
// would, just off the event loop instead of off a real queue, so the
// controller's enqueue-and-return-202 contract is identical either way (see
// docs/adr/0007-bullmq-job-queue.md). No retries — ProcessReportJobService's
// own FAILED-status write is still what the client sees.
export class InProcessReportQueue implements ReportQueue {
  constructor(
    private readonly processor: ProcessReportJobService,
    private readonly logger: Logger,
  ) {}

  async enqueue(payload: ReportJobPayload): Promise<void> {
    setImmediate(() => {
      this.processor.process(payload).catch((error: unknown) => {
        this.logger.error('In-process report job failed', {
          reportId: payload.reportId,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    });
  }
}
