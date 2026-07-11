# ADR 0007: BullMQ job queue for report generation

## Status

Accepted

## Context

Executive report generation (`GenerateReportUseCase`, pre-v1.1) ran fully
inside the HTTP request/response cycle: resolve the dataset, call up to 4
analytics/ML/decision-intelligence use cases, render a PDF with PDFKit,
save it to disk, then respond. It's the slowest synchronous operation in
the app, and it ties up a request-handling connection for the entire
duration of work that has nothing to do with serving HTTP traffic.

## Decision

Report generation moves onto a queue. `POST /reports/generate` now creates
a `Report` row with `status: PENDING` and enqueues a job, responding `202`
immediately; a worker consumes the queue and does the actual PDF work,
updating the row to `PROCESSING` → `COMPLETE` (or `FAILED` with an error
message) as it goes. The frontend polls `GET /reports` until the row
settles — no new endpoint, no websockets, deliberately the simplest thing
that lets a client observe completion.

**BullMQ over alternatives (RabbitMQ, SQS, a bespoke Postgres-polling
queue):** it's Redis-native, and Redis is already being introduced for the
cache/rate-limiter (ADR 0006) — no second piece of broker infrastructure to
run. It gives retries with exponential backoff, job state, and delayed
jobs for free, which a hand-rolled Postgres queue would have to
reimplement.

**Two `ReportQueue` implementations, not one:** `BullMqReportQueue` when
`REDIS_URL` is set, `InProcessReportQueue` (a `setImmediate` call to the
same processing service) when it isn't. Both give the controller an
identical enqueue-and-return-202 contract — the async _shape_ of the API
never changes based on whether Redis is configured, only whether the work
actually crosses a process boundary.

**Worker topology — embedded by default, standalone as an option:**
`WORKER_MODE=embedded` (default) runs a BullMQ `Worker` inside the same
process as the HTTP server — required for Render's free tier, which has no
separate background-worker product. `WORKER_MODE=standalone` is for a
dedicated `worker` container (see `docker-compose.yml`/`docker-compose.prod.yml`)
that runs nothing but the queue consumer — this is the actual "separate,
independently-scalable process" showcase, since multiple standalone
workers consuming one queue concurrently is exactly BullMQ's intended
scaling behavior. Both modes run the identical `ProcessReportJobService`;
only the process topology differs.

## Consequences

- `Report` gained a real state machine (`PENDING → PROCESSING → COMPLETE`,
  or `→ FAILED`) — a migration, nullable `fileName`/`storagePath` (unknown
  until the job finishes), and a `ReportRepository.updateStatus` method
  that didn't exist before.
- `GenerateReportUseCase` was deleted, split into `EnqueueReportUseCase`
  (HTTP-facing: create the row, hand off the job) and
  `ProcessReportJobService` (queue-facing: the actual PDF work, callable
  identically by the embedded worker, a standalone worker, or the
  in-process fallback).
- The existing "generates, lists, downloads all four report types"
  integration test had to change from asserting an immediate `201` to
  polling for `COMPLETE` — a permanent shift in what "the report is ready"
  means for any future test in this area.
- A free-tier Render deploy with `REDIS_URL` unset keeps working exactly
  as before this ADR — synchronous generation, no queue, no worker
  process. Configuring Redis (e.g. Upstash's free tier) is what turns on
  the distributed path; it's additive, not a required upgrade.
