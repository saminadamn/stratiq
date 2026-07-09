import type { CleaningMode, CleaningOperationType } from '@stratiq/shared';
import type { ColumnSchema } from '../../../domain/entities/column-schema.entity.js';
import type { CleaningLogEntry } from '../../../domain/entities/dataset-version.entity.js';
import type { CleaningOperation } from './cleaning-operation.js';
import { ConvertDataTypesOperation } from './convert-data-types.operation.js';
import { FillMissingValuesOperation } from './fill-missing-values.operation.js';
import { RemoveDuplicatesOperation } from './remove-duplicates.operation.js';
import { RemoveInvalidRecordsOperation } from './remove-invalid-records.operation.js';
import { StandardizeCategoriesOperation } from './standardize-categories.operation.js';
import { TrimWhitespaceOperation } from './trim-whitespace.operation.js';

export interface CleaningResult {
  rows: Array<Record<string, unknown>>;
  log: CleaningLogEntry[];
}

// Fixed application order, independent of what order the caller lists
// operations in: duplicates must be removed *after* trimming/standardizing
// (cleaning can make previously-distinct rows identical), and type
// conversion should happen before filling missing numeric values (so the
// mean is computed over real numbers, not numeric-looking strings).
// AUTOMATIC mode runs every operation in this order; MANUAL mode runs only
// the requested subset, still in this order.
const PIPELINE_ORDER: CleaningOperation[] = [
  new TrimWhitespaceOperation(),
  new StandardizeCategoriesOperation(),
  new ConvertDataTypesOperation(),
  new FillMissingValuesOperation(),
  new RemoveInvalidRecordsOperation(),
  new RemoveDuplicatesOperation(),
];

export class CleaningEngine {
  run(
    rows: Array<Record<string, unknown>>,
    schema: ColumnSchema[],
    mode: Extract<CleaningMode, 'AUTOMATIC' | 'MANUAL'>,
    requestedOperations: CleaningOperationType[] | undefined,
  ): CleaningResult {
    const requested = new Set(requestedOperations ?? []);
    const operations =
      mode === 'AUTOMATIC' ? PIPELINE_ORDER : PIPELINE_ORDER.filter((op) => requested.has(op.type));

    let currentRows = rows;
    const log: CleaningLogEntry[] = [];

    for (const operation of operations) {
      const result = operation.apply(currentRows, schema);
      currentRows = result.rows;
      log.push(result.log);
    }

    return { rows: currentRows, log };
  }
}
