import { DomainError } from './domain-error.js';

// Sprint 2 domain errors. Kept in their own file rather than appended to
// domain-error.ts so the Sprint 1 auth/RBAC error file stays untouched.

export class DatasetNotFoundError extends DomainError {
  readonly code = 'DATASET_NOT_FOUND';
  readonly httpStatus = 404;
  constructor() {
    super('Dataset not found.');
  }
}

export class DatasetVersionNotFoundError extends DomainError {
  readonly code = 'DATASET_VERSION_NOT_FOUND';
  readonly httpStatus = 404;
  constructor() {
    super('Dataset version not found.');
  }
}

export class UnsupportedFileTypeError extends DomainError {
  readonly code = 'UNSUPPORTED_FILE_TYPE';
  readonly httpStatus = 400;
  constructor() {
    super('Only CSV and Excel (.xlsx) files are supported.');
  }
}

export class FileTooLargeError extends DomainError {
  readonly code = 'FILE_TOO_LARGE';
  readonly httpStatus = 413;
  constructor(maxSizeMb: number) {
    super(`File exceeds the ${maxSizeMb}MB upload limit.`);
  }
}

export class EmptyFileError extends DomainError {
  readonly code = 'EMPTY_FILE';
  readonly httpStatus = 400;
  constructor() {
    super('The uploaded file contains no data rows.');
  }
}

export class NoFileUploadedError extends DomainError {
  readonly code = 'NO_FILE_UPLOADED';
  readonly httpStatus = 400;
  constructor() {
    super('No file was uploaded.');
  }
}

export class InvalidCleaningRequestError extends DomainError {
  readonly code = 'INVALID_CLEANING_REQUEST';
  readonly httpStatus = 400;
  constructor(message: string) {
    super(message);
  }
}
