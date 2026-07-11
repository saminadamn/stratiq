import { DomainError } from './domain-error.js';

export class ReportNotFoundError extends DomainError {
  readonly code = 'REPORT_NOT_FOUND';
  readonly httpStatus = 404;
  constructor() {
    super('Report not found.');
  }
}

// v1.1 (Distributed Systems Showcase). Report generation is now queued
// (see docs/adr/0007-bullmq-job-queue.md), so a report can exist without a
// downloadable file yet — PENDING/PROCESSING (still working) or FAILED
// (never will).
export class ReportNotReadyError extends DomainError {
  readonly code = 'REPORT_NOT_READY';
  readonly httpStatus = 409;
  constructor(status: 'PENDING' | 'PROCESSING' | 'FAILED') {
    super(
      status === 'FAILED'
        ? 'Report generation failed.'
        : 'Report is still being generated. Try again shortly.',
    );
  }
}
