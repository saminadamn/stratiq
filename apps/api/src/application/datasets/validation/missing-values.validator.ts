import type { ColumnSchema } from '../../../domain/entities/column-schema.entity.js';
import type { ValidationIssue } from '../../../domain/entities/validation-report.entity.js';
import type { ParsedTable } from '../../ports/file-parser.port.js';
import { isBlank } from '../value-helpers.js';
import type { Validator } from './validator.js';

// Folds in the "null percentage" requirement (Sprint 2 spec) as part of this
// same finding rather than a separate validator — a second issue that just
// restates "N% of this column is blank" would be redundant with the count
// this validator already reports.
const ERROR_THRESHOLD_RATIO = 1; // column is 100% blank -> unusable, not just noisy

export class MissingValuesValidator implements Validator {
  validate(table: ParsedTable, _schema: ColumnSchema[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const totalRows = table.rows.length;
    if (totalRows === 0) {
      return issues;
    }

    for (const column of table.columns) {
      const missingCount = table.rows.filter((row) => isBlank(row[column])).length;
      if (missingCount === 0) {
        continue;
      }
      const ratio = missingCount / totalRows;
      const percentage = Math.round(ratio * 1000) / 10;
      issues.push({
        code: 'MISSING_VALUES',
        column,
        count: missingCount,
        severity: ratio >= ERROR_THRESHOLD_RATIO ? 'ERROR' : 'WARNING',
        message: `${missingCount} missing value${missingCount === 1 ? '' : 's'} (${percentage}% of rows)`,
      });
    }

    return issues;
  }
}
