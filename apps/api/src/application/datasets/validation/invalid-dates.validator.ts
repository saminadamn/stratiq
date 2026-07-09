import type { ColumnSchema } from '../../../domain/entities/column-schema.entity.js';
import type { ValidationIssue } from '../../../domain/entities/validation-report.entity.js';
import type { ParsedTable } from '../../ports/file-parser.port.js';
import { isBlank, looksDate } from '../value-helpers.js';
import type { Validator } from './validator.js';

export class InvalidDatesValidator implements Validator {
  validate(table: ParsedTable, schema: ColumnSchema[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const column of schema) {
      if (column.type !== 'DATE') {
        continue;
      }

      const invalidCount = table.rows.filter((row) => {
        const value = row[column.name];
        return !isBlank(value) && !looksDate(value);
      }).length;

      if (invalidCount === 0) {
        continue;
      }

      issues.push({
        code: 'INVALID_DATE',
        column: column.name,
        count: invalidCount,
        severity: 'WARNING',
        message: `${invalidCount} invalid date${invalidCount === 1 ? '' : 's'}`,
      });
    }

    return issues;
  }
}
