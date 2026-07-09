import { DomainError } from './domain-error.js';

export class NoDatasetAvailableError extends DomainError {
  readonly code = 'NO_DATASET_AVAILABLE';
  readonly httpStatus = 404;
  constructor() {
    super('This organization has no ready dataset to run analytics against yet.');
  }
}

export class SavedDashboardViewNotFoundError extends DomainError {
  readonly code = 'SAVED_DASHBOARD_VIEW_NOT_FOUND';
  readonly httpStatus = 404;
  constructor() {
    super('Saved dashboard view not found.');
  }
}
