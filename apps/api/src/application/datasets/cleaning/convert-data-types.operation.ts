import type { ColumnSchema } from '../../../domain/entities/column-schema.entity.js';
import { isBlank, looksBoolean, looksDate, looksNumeric } from '../value-helpers.js';
import type { CleaningOperation, CleaningOperationResult } from './cleaning-operation.js';

export class ConvertDataTypesOperation implements CleaningOperation {
  readonly type = 'CONVERT_DATA_TYPES' as const;

  apply(rows: Array<Record<string, unknown>>, schema: ColumnSchema[]): CleaningOperationResult {
    let cellsAffected = 0;

    const cleaned = rows.map((row) => {
      const next = { ...row };
      for (const column of schema) {
        const value = row[column.name];
        if (isBlank(value)) {
          continue;
        }

        if (column.type === 'NUMBER' && typeof value !== 'number' && looksNumeric(value)) {
          next[column.name] = Number(String(value).trim());
          cellsAffected += 1;
        } else if (column.type === 'BOOLEAN' && typeof value !== 'boolean' && looksBoolean(value)) {
          next[column.name] = String(value).trim().toLowerCase() === 'true';
          cellsAffected += 1;
        } else if (column.type === 'DATE' && looksDate(value)) {
          const iso = new Date(value as string | number).toISOString();
          if (iso !== value) {
            next[column.name] = iso;
            cellsAffected += 1;
          }
        }
      }
      return next;
    });

    return {
      rows: cleaned,
      log: {
        operation: this.type,
        description:
          'Converted values to the detected type for each column (numbers, booleans, ISO dates).',
        rowsAffected: cellsAffected,
      },
    };
  }
}
