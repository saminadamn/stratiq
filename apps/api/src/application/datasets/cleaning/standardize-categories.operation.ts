import type { ColumnSchema } from '../../../domain/entities/column-schema.entity.js';
import type { CleaningOperation, CleaningOperationResult } from './cleaning-operation.js';

// A column "looks categorical" when it has more than one distinct value but
// few enough distinct values relative to row count that it's plausibly a
// fixed set of categories (e.g. "region") rather than free text (e.g. a
// description field) — standardizing free text would mangle it.
const CARDINALITY_RATIO_THRESHOLD = 0.5;
const MIN_DISTINCT_VALUES = 2;

function normalizeKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export class StandardizeCategoriesOperation implements CleaningOperation {
  readonly type = 'STANDARDIZE_CATEGORIES' as const;

  apply(rows: Array<Record<string, unknown>>, schema: ColumnSchema[]): CleaningOperationResult {
    const categoricalColumns = schema.filter(
      (column) => column.type === 'STRING' && this.looksCategorical(rows, column.name),
    );

    const canonicalByColumn = new Map<string, Map<string, string>>();
    for (const column of categoricalColumns) {
      canonicalByColumn.set(column.name, this.buildCanonicalMap(rows, column.name));
    }

    let cellsAffected = 0;
    const cleaned = rows.map((row) => {
      const next = { ...row };
      for (const [columnName, canonicalMap] of canonicalByColumn) {
        const value = row[columnName];
        if (typeof value !== 'string' || value.trim() === '') {
          continue;
        }
        const canonical = canonicalMap.get(normalizeKey(value));
        if (canonical !== undefined && canonical !== value) {
          next[columnName] = canonical;
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
          categoricalColumns.length > 0
            ? `Standardized casing/whitespace variants in: ${categoricalColumns.map((c) => c.name).join(', ')}.`
            : 'No categorical columns detected — nothing to standardize.',
        rowsAffected: cellsAffected,
      },
    };
  }

  private looksCategorical(rows: Array<Record<string, unknown>>, columnName: string): boolean {
    const values = rows
      .map((row) => row[columnName])
      .filter((value): value is string => typeof value === 'string' && value.trim() !== '');
    if (values.length === 0) {
      return false;
    }
    // Distinct RAW values must vary at all (a column that's already 100% one
    // spelling has nothing to standardize) — checked separately from distinct
    // NORMALIZED values, because a column that's entirely "usa"/"USA"/" usa "
    // variants of one category has raw variation but only one normalized
    // group, and that's exactly the case this operation exists to fix.
    const distinctRaw = new Set(values);
    if (distinctRaw.size < MIN_DISTINCT_VALUES) {
      return false;
    }
    const distinctNormalized = new Set(values.map(normalizeKey));
    return distinctNormalized.size / values.length <= CARDINALITY_RATIO_THRESHOLD;
  }

  // Canonical spelling for a group of casing/whitespace variants is whichever
  // original form appears most often — preserves the uploader's own
  // convention (e.g. "USA" vs "usa") instead of imposing one.
  private buildCanonicalMap(
    rows: Array<Record<string, unknown>>,
    columnName: string,
  ): Map<string, string> {
    const variantCounts = new Map<string, Map<string, number>>();
    for (const row of rows) {
      const value = row[columnName];
      if (typeof value !== 'string' || value.trim() === '') {
        continue;
      }
      const key = normalizeKey(value);
      const variants = variantCounts.get(key) ?? new Map<string, number>();
      variants.set(value, (variants.get(value) ?? 0) + 1);
      variantCounts.set(key, variants);
    }

    const canonicalMap = new Map<string, string>();
    for (const [key, variants] of variantCounts) {
      let bestValue = '';
      let bestCount = -1;
      for (const [variant, count] of variants) {
        if (count > bestCount) {
          bestValue = variant;
          bestCount = count;
        }
      }
      canonicalMap.set(key, bestValue);
    }
    return canonicalMap;
  }
}
