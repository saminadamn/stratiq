import type { ColumnSchema } from '../../../domain/entities/column-schema.entity.js';
import type { ValidationIssue } from '../../../domain/entities/validation-report.entity.js';
import type { ParsedTable } from '../../ports/file-parser.port.js';
import type { Validator } from './validator.js';

// Catches ragged CSV rows — a line with more or fewer fields than the header
// declares. Structural (not just descriptive) so it's the one validator that
// reports at ERROR severity: a row that doesn't line up with the header can't
// be trusted column-by-column at all.
export class ColumnConsistencyValidator implements Validator {
  validate(table: ParsedTable, _schema: ColumnSchema[]): ValidationIssue[] {
    const expectedKeys = new Set(table.columns);
    let inconsistentCount = 0;

    for (const row of table.rows) {
      const keys = Object.keys(row);
      const hasExtraKey = keys.some((key) => !expectedKeys.has(key));
      const hasMissingKey = keys.length < expectedKeys.size;
      if (hasExtraKey || hasMissingKey) {
        inconsistentCount += 1;
      }
    }

    if (inconsistentCount === 0) {
      return [];
    }

    return [
      {
        code: 'COLUMN_INCONSISTENCY',
        count: inconsistentCount,
        severity: 'ERROR',
        message: `${inconsistentCount} row${inconsistentCount === 1 ? '' : 's'} with a different number of columns than the header`,
      },
    ];
  }
}
