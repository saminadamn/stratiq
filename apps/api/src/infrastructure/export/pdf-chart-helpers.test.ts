import PDFDocument from 'pdfkit';
import { describe, expect, it } from 'vitest';
import { drawChart } from './pdf-chart-helpers.js';

// A PDFDocument with no listeners still buffers content fine for these
// tests — we only care that drawing doesn't throw and advances the cursor
// sensibly, not about pixel-perfect rendered output.
function newDoc(): InstanceType<typeof PDFDocument> {
  const doc = new PDFDocument({ margin: 50 });
  doc.on('data', () => undefined);
  return doc;
}

describe('drawChart', () => {
  it('draws a bar chart and returns a y-offset below the chart', () => {
    const doc = newDoc();
    const nextY = drawChart(
      doc,
      { type: 'bar', data: [{ label: 'A', value: 10 }, { label: 'B', value: 20 }] },
      50,
      100,
      400,
    );
    expect(nextY).toBeGreaterThan(100);
    doc.end();
  });

  it('draws a line chart and returns a y-offset below the chart', () => {
    const doc = newDoc();
    const nextY = drawChart(
      doc,
      { type: 'line', data: [{ label: '2024-01', value: 100 }, { label: '2024-02', value: 150 }] },
      50,
      100,
      400,
    );
    expect(nextY).toBeGreaterThan(100);
    doc.end();
  });

  it('is a no-op that returns the input y for empty data', () => {
    const doc = newDoc();
    const nextY = drawChart(doc, { type: 'bar', data: [] }, 50, 100, 400);
    expect(nextY).toBe(100);
    doc.end();
  });

  it('handles a single data point without dividing by zero', () => {
    const doc = newDoc();
    expect(() =>
      drawChart(doc, { type: 'line', data: [{ label: 'Only', value: 42 }] }, 50, 100, 400),
    ).not.toThrow();
    doc.end();
  });
});
