import type { ColumnSchema } from '../../../domain/entities/column-schema.entity.js';
import type { ValidationIssue } from '../../../domain/entities/validation-report.entity.js';
import type { ParsedTable } from '../../ports/file-parser.port.js';
import { rowFingerprint } from '../value-helpers.js';
import type { Validator } from './validator.js';

export class DuplicateRowsValidator implements Validator {
  validate(table: ParsedTable, _schema: ColumnSchema[]): ValidationIssue[] {
    const seen = new Map<string, number>();
    for (const row of table.rows) {
      const key = rowFingerprint(row);
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }

    // "41 rows" in the Sprint 2 example means the extra occurrences beyond
    // the first — not the total size of every group that has a duplicate.
    let duplicateCount = 0;
    for (const occurrences of seen.values()) {
      if (occurrences > 1) {
        duplicateCount += occurrences - 1;
      }
    }

    if (duplicateCount === 0) {
      return [];
    }

    return [
      {
        code: 'DUPLICATE_ROWS',
        count: duplicateCount,
        severity: 'WARNING',
        message: `${duplicateCount} duplicate row${duplicateCount === 1 ? '' : 's'}`,
      },
    ];
  }
}
