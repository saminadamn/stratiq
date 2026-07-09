import type { ColumnSchema } from '../../../domain/entities/column-schema.entity.js';
import type { CleaningOperation, CleaningOperationResult } from './cleaning-operation.js';

export class TrimWhitespaceOperation implements CleaningOperation {
  readonly type = 'TRIM_WHITESPACE' as const;

  apply(rows: Array<Record<string, unknown>>, _schema: ColumnSchema[]): CleaningOperationResult {
    let cellsAffected = 0;

    const cleaned = rows.map((row) => {
      const next: Record<string, unknown> = { ...row };
      for (const [key, value] of Object.entries(row)) {
        if (typeof value !== 'string') {
          continue;
        }
        const trimmed = value.trim().replace(/\s+/g, ' ');
        if (trimmed !== value) {
          next[key] = trimmed;
          cellsAffected += 1;
        }
      }
      return next;
    });

    return {
      rows: cleaned,
      log: {
        operation: this.type,
        description: 'Trimmed leading/trailing whitespace and collapsed repeated spaces.',
        rowsAffected: cellsAffected,
      },
    };
  }
}
