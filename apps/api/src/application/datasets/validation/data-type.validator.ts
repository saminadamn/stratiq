import type { ColumnSchema } from '../../../domain/entities/column-schema.entity.js';
import type { ValidationIssue } from '../../../domain/entities/validation-report.entity.js';
import type { ParsedTable } from '../../ports/file-parser.port.js';
import { isBlank, looksBoolean, looksNumeric } from '../value-helpers.js';
import type { Validator } from './validator.js';

// Only checks NUMBER/BOOLEAN columns — DATE columns have their own dedicated
// InvalidDatesValidator so "12 invalid dates" and "12 invalid type" don't
// both fire for the same cells.
export class DataTypeValidator implements Validator {
  validate(table: ParsedTable, schema: ColumnSchema[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const column of schema) {
      if (column.type !== 'NUMBER' && column.type !== 'BOOLEAN') {
        continue;
      }
      const predicate = column.type === 'NUMBER' ? looksNumeric : looksBoolean;

      const invalidCount = table.rows.filter((row) => {
        const value = row[column.name];
        return !isBlank(value) && !predicate(value);
      }).length;

      if (invalidCount === 0) {
        continue;
      }

      issues.push({
        code: 'INVALID_TYPE',
        column: column.name,
        count: invalidCount,
        severity: 'WARNING',
        message: `${invalidCount} value${invalidCount === 1 ? '' : 's'} not matching the expected ${column.type.toLowerCase()} type`,
      });
    }

    return issues;
  }
}
