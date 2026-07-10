import type PDFDocumentClass from 'pdfkit';

type PDFDocument = InstanceType<typeof PDFDocumentClass>;

const HEADER_BG = '#0f766e'; // teal-700 — matches the app's brand accent (Tailwind's `indigo` scale, remapped to teal)
const HEADER_TEXT = '#ffffff';
const ROW_ALT_BG = '#f0fdfa'; // teal-50
const BORDER_COLOR = '#e2e8f0'; // slate-200
const TEXT_COLOR = '#334155'; // slate-700
const CELL_PADDING = 6;
const FONT_SIZE = 9;
const MIN_COLUMN_WIDTH = 50;

// A table needs to know its own header row so a header can be redrawn at
// the top of every page it spans — plain sequential doc.text() calls have
// no way to do that, which is the root of the "keeps drawing regardless of
// where the chart ended" class of bug this whole file exists to fix.
function computeColumnWidths(
  doc: PDFDocument,
  headers: string[],
  rows: Array<Record<string, string | number>>,
  totalWidth: number,
): number[] {
  doc.font('Helvetica').fontSize(FONT_SIZE);
  const sampleRows = rows.slice(0, 50);
  const rawWidths = headers.map((header) => {
    let max = doc.widthOfString(header);
    for (const row of sampleRows) {
      max = Math.max(max, doc.widthOfString(String(row[header] ?? '')));
    }
    return Math.max(MIN_COLUMN_WIDTH, max + CELL_PADDING * 2);
  });

  const sum = rawWidths.reduce((a, b) => a + b, 0);
  if (sum === 0) {
    return headers.map(() => totalWidth / headers.length);
  }
  // Scale to exactly fill totalWidth either way — content-sized columns
  // that also use the full page width, rather than a fixed equal split
  // that wastes space on short columns and starves long ones.
  return rawWidths.map((w) => (w / sum) * totalWidth);
}

function rowHeight(
  doc: PDFDocument,
  headers: string[],
  row: Record<string, string | number>,
  widths: number[],
): number {
  let max = FONT_SIZE + CELL_PADDING * 2;
  headers.forEach((header, i) => {
    const text = String(row[header] ?? '');
    const columnWidth = widths[i] ?? MIN_COLUMN_WIDTH;
    const height =
      doc.heightOfString(text, { width: columnWidth - CELL_PADDING * 2 }) + CELL_PADDING * 2;
    max = Math.max(max, height);
  });
  return max;
}

function drawHeaderRow(
  doc: PDFDocument,
  headers: string[],
  widths: number[],
  x: number,
  y: number,
): number {
  const height = FONT_SIZE + CELL_PADDING * 2;
  doc
    .rect(
      x,
      y,
      widths.reduce((a, b) => a + b, 0),
      height,
    )
    .fill(HEADER_BG);
  let cellX = x;
  doc.font('Helvetica-Bold').fontSize(FONT_SIZE).fillColor(HEADER_TEXT);
  headers.forEach((header, i) => {
    const columnWidth = widths[i] ?? MIN_COLUMN_WIDTH;
    doc.text(toLabel(header), cellX + CELL_PADDING, y + CELL_PADDING, {
      width: columnWidth - CELL_PADDING * 2,
      lineBreak: false,
      ellipsis: true,
    });
    cellX += columnWidth;
  });
  doc.fillColor(TEXT_COLOR).font('Helvetica');
  return y + height;
}

function toLabel(camelCaseKey: string): string {
  // "churnProbability" -> "Churn Probability" — headers come straight from
  // DTO property names (see report-builder.service.ts), so this is the one
  // place that turns them into something a reader would expect in a report.
  const spaced = camelCaseKey.replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// Draws a table with content-sized columns, wrapped cell text, alternating
// row shading, and a header that repeats at the top of every page the table
// spans. Returns the y position immediately after the table so callers never
// have to guess how tall it ended up being (see pdfkit-report-generator.ts).
export function drawTable(
  doc: PDFDocument,
  rows: Array<Record<string, string | number>>,
  x: number,
  y: number,
  width: number,
): number {
  if (rows.length === 0) {
    return y;
  }
  const headers = Object.keys(rows[0] as Record<string, string | number>);
  const widths = computeColumnWidths(doc, headers, rows, width);
  const bottomLimit = doc.page.height - doc.page.margins.bottom;

  let cursorY = drawHeaderRow(doc, headers, widths, x, y);

  rows.forEach((row, rowIndex) => {
    const height = rowHeight(doc, headers, row, widths);

    if (cursorY + height > bottomLimit) {
      doc.addPage();
      cursorY = drawHeaderRow(doc, headers, widths, x, doc.page.margins.top);
    }

    if (rowIndex % 2 === 1) {
      doc.rect(x, cursorY, width, height).fill(ROW_ALT_BG);
    }
    doc.strokeColor(BORDER_COLOR).lineWidth(0.5).rect(x, cursorY, width, height).stroke();

    let cellX = x;
    doc.fillColor(TEXT_COLOR).font('Helvetica').fontSize(FONT_SIZE);
    headers.forEach((header, i) => {
      const columnWidth = widths[i] ?? MIN_COLUMN_WIDTH;
      doc.text(String(row[header] ?? ''), cellX + CELL_PADDING, cursorY + CELL_PADDING, {
        width: columnWidth - CELL_PADDING * 2,
      });
      // Vertical column separators, drawn after the text so they sit on top.
      if (i > 0) {
        doc
          .strokeColor(BORDER_COLOR)
          .lineWidth(0.5)
          .moveTo(cellX, cursorY)
          .lineTo(cellX, cursorY + height)
          .stroke();
      }
      cellX += columnWidth;
    });

    cursorY += height;
  });

  return cursorY;
}
