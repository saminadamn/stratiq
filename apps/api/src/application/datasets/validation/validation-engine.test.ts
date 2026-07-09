import { describe, expect, it } from 'vitest';
import { inferSchema } from '../infer-schema.js';
import { ValidationEngine } from './validation-engine.js';
import type { ParsedTable } from '../../ports/file-parser.port.js';

const engine = new ValidationEngine();

function run(table: ParsedTable) {
  const schema = inferSchema(table);
  return engine.run(table, schema);
}

function issueCodes(report: ReturnType<typeof run>): string[] {
  return report.issues.map((issue) => issue.code);
}

describe('ValidationEngine', () => {
  it('reports MISSING_VALUES for blank cells', () => {
    const report = run({
      columns: ['id', 'name'],
      rows: [
        { id: '1', name: 'Ada' },
        { id: '2', name: '' },
      ],
    });
    const issue = report.issues.find((i) => i.code === 'MISSING_VALUES');
    expect(issue).toMatchObject({ column: 'name', count: 1 });
  });

  it('reports DUPLICATE_ROWS counting only the extra occurrences', () => {
    const report = run({
      columns: ['id'],
      rows: [{ id: '1' }, { id: '1' }, { id: '1' }, { id: '2' }],
    });
    const issue = report.issues.find((i) => i.code === 'DUPLICATE_ROWS');
    // Three occurrences of id=1 -> 2 "extra" duplicates, not 3.
    expect(issue?.count).toBe(2);
  });

  it('reports NEGATIVE_VALUES for numeric columns without treating it as an error', () => {
    const report = run({
      columns: ['profit'],
      rows: [{ profit: '10' }, { profit: '-5' }],
    });
    const issue = report.issues.find((i) => i.code === 'NEGATIVE_VALUES');
    expect(issue).toMatchObject({ count: 1, severity: 'WARNING' });
  });

  it('reports INVALID_DATE for outliers in an otherwise-date column', () => {
    const rows = Array.from({ length: 20 }, () => ({ orderDate: '2024-01-01' }));
    rows.push({ orderDate: 'garbage' });
    const report = run({ columns: ['orderDate'], rows });
    const issue = report.issues.find((i) => i.code === 'INVALID_DATE');
    expect(issue?.count).toBe(1);
  });

  it('reports COLUMN_INCONSISTENCY at ERROR severity for ragged rows', () => {
    const report = run({
      columns: ['a', 'b'],
      rows: [{ a: '1', b: '2' }, { a: '1' }],
    });
    const issue = report.issues.find((i) => i.code === 'COLUMN_INCONSISTENCY');
    expect(issue).toMatchObject({ count: 1, severity: 'ERROR' });
  });

  it('produces a clean report with score 100 for well-formed data', () => {
    const report = run({
      columns: ['id', 'name'],
      rows: [
        { id: '1', name: 'Ada' },
        { id: '2', name: 'Grace' },
      ],
    });
    expect(issueCodes(report)).toEqual([]);
    expect(report.qualityScore).toBe(100);
  });
});
