import { DomainError } from './domain-error.js';

export class MetricNotFoundError extends DomainError {
  readonly code = 'METRIC_NOT_FOUND';
  readonly httpStatus = 404;
  constructor() {
    super('Metric definition not found.');
  }
}

export class AlertNotFoundError extends DomainError {
  readonly code = 'ALERT_NOT_FOUND';
  readonly httpStatus = 404;
  constructor() {
    super('Alert not found.');
  }
}

export class BusinessRuleNotFoundError extends DomainError {
  readonly code = 'BUSINESS_RULE_NOT_FOUND';
  readonly httpStatus = 404;
  constructor() {
    super('Business rule not found.');
  }
}

export class MetricNotComputableError extends DomainError {
  readonly code = 'METRIC_NOT_COMPUTABLE';
  readonly httpStatus = 422;
  constructor() {
    super('This metric cannot be computed for the current dataset (e.g. it has no date column).');
  }
}
