import { DomainError } from './domain-error.js';

export class ReportNotFoundError extends DomainError {
  readonly code = 'REPORT_NOT_FOUND';
  readonly httpStatus = 404;
  constructor() {
    super('Report not found.');
  }
}
