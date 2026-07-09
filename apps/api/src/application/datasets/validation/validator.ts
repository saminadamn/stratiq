import type { ColumnSchema } from '../../../domain/entities/column-schema.entity.js';
import type { ValidationIssue } from '../../../domain/entities/validation-report.entity.js';
import type { ParsedTable } from '../../ports/file-parser.port.js';

// One rule in the validation engine. Each validator is independent and
// order-agnostic — the engine just concatenates every validator's issues, so
// adding a new check (e.g. a future "outlier detection" rule) never requires
// touching the others.
export interface Validator {
  validate(table: ParsedTable, schema: ColumnSchema[]): ValidationIssue[];
}
