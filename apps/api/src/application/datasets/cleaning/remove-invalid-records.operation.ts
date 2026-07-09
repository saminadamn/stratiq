import type { ColumnType } from '@stratiq/shared';
import type { ColumnSchema } from '../../../domain/entities/column-schema.entity.js';
import { isBlank, looksBoolean, looksDate, looksNumeric } from '../value-helpers.js';
import type { CleaningOperation, CleaningOperationResult } from './cleaning-operation.js';

export class RemoveInvalidRecordsOperation implements CleaningOperation {
  readonly type = 'REMOVE_INVALID_RECORDS' as const;

  apply(rows: Array<Record<string, unknown>>, schema: ColumnSchema[]): CleaningOperationResult {
    const typedColumns = schema.filter((column) => column.type !== 'STRING');

    const kept = rows.filter((row) =>
      typedColumns.every((column) => this.isValidCell(row[column.name], column.type)),
    );

    return {
      rows: kept,
      log: {
        operation: this.type,
        description:
          'Removed rows containing a value that does not match the detected type for its column.',
        rowsAffected: rows.length - kept.length,
      },
    };
  }

  private isValidCell(value: unknown, type: ColumnType): boolean {
    // Missingness is FILL_MISSING_VALUES's concern, not this operation's — a
    // blank cell in a nullable column isn't "invalid".
    if (isBlank(value)) {
      return true;
    }
    if (type === 'NUMBER') {
      return looksNumeric(value);
    }
    if (type === 'BOOLEAN') {
      return looksBoolean(value);
    }
    if (type === 'DATE') {
      return looksDate(value);
    }
    return true;
  }
}
