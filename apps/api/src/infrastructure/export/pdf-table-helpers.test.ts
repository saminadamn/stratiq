import PDFDocument from 'pdfkit';
import { describe, expect, it } from 'vitest';
import { drawTable } from './pdf-table-helpers.js';

// Same rationale as pdf-chart-helpers.test.ts: a PDFDocument with no
// listeners still buffers content fine for these tests — we only care that
// drawing doesn't throw and advances the cursor/page count sensibly, not
// about pixel-perfect rendered output.
function newDoc(): InstanceType<typeof PDFDocument> {
  const doc = new PDFDocument({ margin: 50, bufferPages: true });
  doc.on('data', () => undefined);
  return doc;
}

describe('drawTable', () => {
  it('is a no-op that returns the input y for empty rows', () => {
    const doc = newDoc();
    const nextY = drawTable(doc, [], 50, 100, 400);
    expect(nextY).toBe(100);
    doc.end();
  });

  it('draws a table and returns a y-offset below it', () => {
    const doc = newDoc();
    const nextY = drawTable(
      doc,
      [
        { customer: 'Alice', churnProbability: '80%' },
        { customer: 'Bob', churnProbability: '45%' },
      ],
      50,
      100,
      400,
    );
    // At minimum the header row plus one data row's worth of height.
    expect(nextY).toBeGreaterThan(100 + 15);
    doc.end();
  });

  it('wraps long cell text instead of overflowing into the next column', () => {
    const doc = newDoc();
    const nextY = drawTable(
      doc,
      [
        {
          title: 'Why Revenue declined',
          explanation:
            'Revenue decreased 72.22% to $1,000 in 2025-01, compared to $3,600 in 2024-12. The primary driver was averageOrderValue.',
        },
      ],
      50,
      100,
      400,
    );
    // A wrapped long explanation takes noticeably more vertical space than
    // a single short line would — this is the regression test for the
    // "no alignment, text runs together" bug: rows must get taller instead
    // of clipping/overlapping when a cell's text doesn't fit on one line.
    expect(nextY).toBeGreaterThan(160);
    doc.end();
  });

  it('breaks onto a new page and repeats the header when rows overflow one page', () => {
    const doc = newDoc();
    const rows = Array.from({ length: 60 }, (_, i) => ({
      customer: `Customer ${i + 1}`,
      churnProbability: `${60 + (i % 30)}%`,
    }));
    expect(() => drawTable(doc, rows, 50, 100, 400)).not.toThrow();
    // bufferedPageRange() must be read before end() — once the document is
    // finalized, PDFKit stops tracking it (this is also why the real report
    // generator calls addFooters() before doc.end(), not after).
    expect(doc.bufferedPageRange().count).toBeGreaterThan(1);
    doc.end();
  });
});
