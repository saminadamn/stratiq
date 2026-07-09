import { describe, expect, it } from 'vitest';
import { inferSchema } from './infer-schema.js';
import type { ParsedTable } from '../ports/file-parser.port.js';

function table(columns: string[], rows: Array<Record<string, unknown>>): ParsedTable {
  return { columns, rows };
}

describe('inferSchema', () => {
  it('infers NUMBER for a fully numeric column', () => {
    const schema = inferSchema(table(['amount'], [{ amount: '10' }, { amount: '20' }]));
    expect(schema[0]).toEqual({ name: 'amount', type: 'NUMBER', nullable: false });
  });

  it('infers DATE by majority even with a few invalid outliers', () => {
    const rows = Array.from({ length: 96 }, () => ({ orderDate: '2024-01-01' })).concat(
      Array.from({ length: 4 }, () => ({ orderDate: 'not-a-date' })),
    );
    const schema = inferSchema(table(['orderDate'], rows));
    expect(schema[0]?.type).toBe('DATE');
  });

  it('falls back to STRING when no type reaches the majority threshold', () => {
    const rows = [{ mixed: '1' }, { mixed: 'abc' }, { mixed: 'true' }, { mixed: '2024-01-01' }];
    const schema = inferSchema(table(['mixed'], rows));
    expect(schema[0]?.type).toBe('STRING');
  });

  it('marks a column nullable when any row is missing a value', () => {
    const schema = inferSchema(table(['name'], [{ name: 'Ada' }, { name: '' }]));
    expect(schema[0]?.nullable).toBe(true);
  });

  it('defaults an entirely blank column to STRING/nullable', () => {
    const schema = inferSchema(table(['empty'], [{ empty: '' }, { empty: null }]));
    expect(schema[0]).toEqual({ name: 'empty', type: 'STRING', nullable: true });
  });
});
