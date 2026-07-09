import { describe, expect, it } from 'vitest';
import { inferSchema } from '../infer-schema.js';
import { CleaningEngine } from './cleaning-engine.js';
import type { ParsedTable } from '../../ports/file-parser.port.js';

const engine = new CleaningEngine();

function run(
  rows: Array<Record<string, unknown>>,
  columns: string[],
  mode: 'AUTOMATIC' | 'MANUAL',
  operations?: Parameters<CleaningEngine['run']>[3],
) {
  const table: ParsedTable = { columns, rows };
  const schema = inferSchema(table);
  return engine.run(rows, schema, mode, operations);
}

describe('CleaningEngine', () => {
  it('trims whitespace when TRIM_WHITESPACE is requested', () => {
    const result = run([{ name: '  Ada  ' }], ['name'], 'MANUAL', ['TRIM_WHITESPACE']);
    expect(result.rows[0]?.['name']).toBe('Ada');
  });

  it('removes exact duplicate rows when REMOVE_DUPLICATES is requested', () => {
    const result = run([{ id: '1' }, { id: '1' }, { id: '2' }], ['id'], 'MANUAL', [
      'REMOVE_DUPLICATES',
    ]);
    expect(result.rows).toHaveLength(2);
  });

  it('fills missing numeric values with the column mean', () => {
    const result = run([{ amount: '10' }, { amount: '20' }, { amount: '' }], ['amount'], 'MANUAL', [
      'FILL_MISSING_VALUES',
    ]);
    expect(result.rows[2]?.['amount']).toBe(15);
  });

  it('converts numeric-looking strings to real numbers with CONVERT_DATA_TYPES', () => {
    const result = run([{ amount: '10' }, { amount: '20' }], ['amount'], 'MANUAL', [
      'CONVERT_DATA_TYPES',
    ]);
    expect(result.rows.every((row) => typeof row['amount'] === 'number')).toBe(true);
  });

  it('removes rows with a value that does not match the detected column type', () => {
    // 4 valid numbers + 1 outlier -> column is still inferred NUMBER (majority),
    // and REMOVE_INVALID_RECORDS should drop only the outlier row.
    const rows = [
      { amount: '1' },
      { amount: '2' },
      { amount: '3' },
      { amount: '4' },
      { amount: 'oops' },
    ];
    const result = run(rows, ['amount'], 'MANUAL', ['REMOVE_INVALID_RECORDS']);
    expect(result.rows).toHaveLength(4);
  });

  it('applies operations in a fixed order regardless of the caller-provided order', () => {
    // Requesting REMOVE_DUPLICATES before TRIM_WHITESPACE should still trim
    // first, so rows that only differ by whitespace end up deduplicated.
    const result = run([{ name: 'Ada' }, { name: ' Ada ' }], ['name'], 'MANUAL', [
      'REMOVE_DUPLICATES',
      'TRIM_WHITESPACE',
    ]);
    expect(result.rows).toHaveLength(1);
  });

  it('runs every operation in AUTOMATIC mode', () => {
    const result = run([{ name: '  Ada  ' }, { name: '  Ada  ' }], ['name'], 'AUTOMATIC');
    expect(result.log.map((entry) => entry.operation)).toEqual([
      'TRIM_WHITESPACE',
      'STANDARDIZE_CATEGORIES',
      'CONVERT_DATA_TYPES',
      'FILL_MISSING_VALUES',
      'REMOVE_INVALID_RECORDS',
      'REMOVE_DUPLICATES',
    ]);
    expect(result.rows).toHaveLength(1);
  });

  it('standardizes casing/whitespace variants to the most frequent original form', () => {
    const rows = [{ region: 'usa' }, { region: 'USA' }, { region: 'USA' }, { region: ' usa ' }];
    const result = run(rows, ['region'], 'MANUAL', ['STANDARDIZE_CATEGORIES']);
    const values = new Set(result.rows.map((row) => row['region']));
    expect(values.size).toBe(1);
    expect(values.has('USA')).toBe(true);
  });
});
