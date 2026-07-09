import type { CleaningOperationType } from '@stratiq/shared';
import type { ColumnSchema } from '../../../domain/entities/column-schema.entity.js';
import type { CleaningLogEntry } from '../../../domain/entities/dataset-version.entity.js';

export interface CleaningOperationResult {
  rows: Array<Record<string, unknown>>;
  log: CleaningLogEntry;
}

// One cleaning transformation. Every operation is pure (rows in, new rows +
// a log entry out) and has no knowledge of the others — the CleaningEngine
// owns ordering, so operations can be composed in any subset (manual mode)
// or all together (automatic mode) without their implementations changing.
export interface CleaningOperation {
  readonly type: CleaningOperationType;
  apply(rows: Array<Record<string, unknown>>, schema: ColumnSchema[]): CleaningOperationResult;
}
