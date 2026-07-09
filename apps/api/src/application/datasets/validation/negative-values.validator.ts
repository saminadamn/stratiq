import type { ColumnSchema } from '../../../domain/entities/column-schema.entity.js';
import type { ValidationIssue } from '../../../domain/entities/validation-report.entity.js';
import type { ParsedTable } from '../../ports/file-parser.port.js';
import { toNumber } from '../value-helpers.js';
import type { Validator } from './validator.js';

// Reported as a descriptive signal, not a hard failure — a "Profit" column is
// legitimately negative for a loss-making order. The Sprint 2 spec's own
// example lists negative Profit values as a warning anyway: the validation
// report surfaces this for a human to judge, it doesn't reject the data.
export class NegativeValuesValidator implements Validator {
  validate(table: ParsedTable, schema: ColumnSchema[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const column of schema) {
      if (column.type !== 'NUMBER') {
        continue;
      }

      const negativeCount = table.rows.filter((row) => {
        const value = toNumber(row[column.name]);
        return value !== null && value < 0;
      }).length;

      if (negativeCount === 0) {
        continue;
      }

      issues.push({
        code: 'NEGATIVE_VALUES',
        column: column.name,
        count: negativeCount,
        severity: 'WARNING',
        message: `${negativeCount} negative value${negativeCount === 1 ? '' : 's'}`,
      });
    }

    return issues;
  }
}
