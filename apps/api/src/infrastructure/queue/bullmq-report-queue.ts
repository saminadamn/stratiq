import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import type { ReportJobPayload, ReportQueue } from '../../application/ports/report-queue.port.js';

export const REPORT_QUEUE_NAME = 'report-generation';

export class BullMqReportQueue implements ReportQueue {
  private readonly queue: Queue<ReportJobPayload>;

  constructor(connection: Redis) {
    this.queue = new Queue<ReportJobPayload>(REPORT_QUEUE_NAME, { connection });
  }

  async enqueue(payload: ReportJobPayload): Promise<void> {
    await this.queue.add('generate', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  // Exposed for the /metrics queue-depth gauge (see
  // infrastructure/observability/metrics.ts) — the only consumer outside
  // this class that needs the raw BullMQ Queue rather than the ReportQueue
  // port's narrower enqueue-only surface.
  getQueue(): Queue<ReportJobPayload> {
    return this.queue;
  }
}
