import type { ColumnSchema } from '../../../domain/entities/column-schema.entity.js';
import { rowFingerprint } from '../value-helpers.js';
import type { CleaningOperation, CleaningOperationResult } from './cleaning-operation.js';

export class RemoveDuplicatesOperation implements CleaningOperation {
  readonly type = 'REMOVE_DUPLICATES' as const;

  apply(rows: Array<Record<string, unknown>>, _schema: ColumnSchema[]): CleaningOperationResult {
    const seen = new Set<string>();
    const kept: Array<Record<string, unknown>> = [];

    for (const row of rows) {
      const key = rowFingerprint(row);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      kept.push(row);
    }

    return {
      rows: kept,
      log: {
        operation: this.type,
        description: 'Removed duplicate rows, keeping the first occurrence of each.',
        rowsAffected: rows.length - kept.length,
      },
    };
  }
}
