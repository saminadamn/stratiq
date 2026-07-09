import type { ColumnSchema } from '../../../domain/entities/column-schema.entity.js';
import { isBlank, toNumber } from '../value-helpers.js';
import type { CleaningOperation, CleaningOperationResult } from './cleaning-operation.js';

function mostFrequent(values: unknown[]): unknown {
  const counts = new Map<unknown, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  let best: unknown;
  let bestCount = -1;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

export class FillMissingValuesOperation implements CleaningOperation {
  readonly type = 'FILL_MISSING_VALUES' as const;

  apply(rows: Array<Record<string, unknown>>, schema: ColumnSchema[]): CleaningOperationResult {
    const fillValueByColumn = new Map<string, unknown>();

    for (const column of schema) {
      const nonBlank = rows.map((row) => row[column.name]).filter((value) => !isBlank(value));
      // A column with no values at all has nothing to derive a fill value
      // from — leaving it blank is more honest than inventing a default.
      if (nonBlank.length === 0) {
        continue;
      }

      if (column.type === 'NUMBER') {
        const numbers = nonBlank.map(toNumber).filter((n): n is number => n !== null);
        if (numbers.length === 0) {
          continue;
        }
        const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
        fillValueByColumn.set(column.name, Math.round(mean * 100) / 100);
      } else {
        fillValueByColumn.set(column.name, mostFrequent(nonBlank));
      }
    }

    let cellsAffected = 0;
    const cleaned = rows.map((row) => {
      const next = { ...row };
      for (const [columnName, fillValue] of fillValueByColumn) {
        if (isBlank(row[columnName])) {
          next[columnName] = fillValue;
          cellsAffected += 1;
        }
      }
      return next;
    });

    return {
      rows: cleaned,
      log: {
        operation: this.type,
        description:
          'Filled missing values: numeric columns with the column mean, others with the most frequent value.',
        rowsAffected: cellsAffected,
      },
    };
  }
}
