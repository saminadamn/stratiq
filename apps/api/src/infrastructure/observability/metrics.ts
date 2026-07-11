import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';
import type { Queue } from 'bullmq';

// A bare `/metrics` endpoint in Prometheus exposition format — real
// instrumentation, deliberately without a Prometheus/Grafana stack (see
// docs/adr/0008-observability.md for why). Built once at boot and reused
// across the process; the report queue (when Redis-backed) is wired in
// after the fact via setReportQueue, since the queue isn't constructed
// until later in composition-root.ts.
export const registry = new Registry();
collectDefaultMetrics({ register: registry });

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

let reportQueue: Queue | null = null;

export function setReportQueue(queue: Queue): void {
  reportQueue = queue;
}

new Gauge({
  name: 'report_queue_jobs',
  help: 'BullMQ report-generation queue depth by state',
  labelNames: ['state'],
  registers: [registry],
  async collect() {
    if (!reportQueue) {
      return;
    }
    const counts = await reportQueue.getJobCounts();
    for (const [state, count] of Object.entries(counts)) {
      this.set({ state }, count);
    }
  },
});
