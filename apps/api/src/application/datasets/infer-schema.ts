import type { ColumnType } from '@stratiq/shared';
import type { ColumnSchema } from '../../domain/entities/column-schema.entity.js';
import type { ParsedTable } from '../ports/file-parser.port.js';
import { isBlank, looksBoolean, looksDate, looksNumeric } from './value-helpers.js';

// A column is typed as X when at least this fraction of its non-blank values
// look like X. Majority (not unanimous) on purpose: a column that's 96% valid
// dates should still be inferred as DATE, with the remaining 4% surfaced by
// the validation engine as "invalid dates" outliers — requiring 100%
// agreement would instead silently downgrade the whole column to STRING and
// hide exactly the issue the validation report is supposed to catch.
const TYPE_MAJORITY_THRESHOLD = 0.8;

function ratio(values: unknown[], predicate: (value: unknown) => boolean): number {
  return values.filter(predicate).length / values.length;
}

function majorityType(nonBlank: unknown[]): ColumnType {
  if (ratio(nonBlank, looksNumeric) >= TYPE_MAJORITY_THRESHOLD) {
    return 'NUMBER';
  }
  if (ratio(nonBlank, looksBoolean) >= TYPE_MAJORITY_THRESHOLD) {
    return 'BOOLEAN';
  }
  if (ratio(nonBlank, looksDate) >= TYPE_MAJORITY_THRESHOLD) {
    return 'DATE';
  }
  return 'STRING';
}

export function inferSchema(table: ParsedTable): ColumnSchema[] {
  return table.columns.map((name) => {
    const values = table.rows.map((row) => row[name]);
    const nonBlank = values.filter((value) => !isBlank(value));
    const nullable = nonBlank.length < values.length;

    if (nonBlank.length === 0) {
      return { name, type: 'STRING', nullable: true };
    }

    return { name, type: majorityType(nonBlank), nullable };
  });
}
