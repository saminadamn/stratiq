import PDFDocumentImpl from 'pdfkit';
import type PDFDocumentClass from 'pdfkit';
import type {
  PdfReportRequest,
  ReportGenerator,
} from '../../application/ports/report-generator.port.js';
import { drawCards, drawParagraphs, emptyStateText } from './pdf-card-helpers.js';
import { drawChart } from './pdf-chart-helpers.js';
import { drawTable } from './pdf-table-helpers.js';

// Same `import ... as value` + `type ... = InstanceType<...>` split as
// pdf-chart-helpers.ts / pdf-table-helpers.ts — pdfkit's type declarations
// don't let the default export be used as both a constructor and a type
// annotation directly (TS2749).
type PDFDocument = InstanceType<typeof PDFDocumentClass>;

const BRAND_COLOR = '#0f766e'; // teal-700
const BRAND_LIGHT = '#0d9488'; // teal-600
const HEADING_COLOR = '#0f172a'; // slate-900
const BODY_COLOR = '#334155'; // slate-700
const MUTED_COLOR = '#94a3b8'; // slate-400

// Formatted, page-break-aware report, not a pixel-perfect capture of the
// dashboard UI — rendering actual charts server-side would need a headless
// browser (Puppeteer) purely to rasterize a page, which is a heavy
// dependency for this project's scope. Charts are native PDFKit vector
// primitives (pdf-chart-helpers.ts) and tables are a real fixed-column grid
// (pdf-table-helpers.ts), not joined strings — see docs/ARCHITECTURE.md,
// "Export: CSV/PDF server-side, PNG client-side".
export class PdfKitReportGenerator implements ReportGenerator {
  async generatePdf(request: PdfReportRequest): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      // bufferPages defers writing pages until doc.end(), which is what
      // lets addFooters() go back and stamp a page number on every page
      // once the total count is known — impossible to know up front since
      // tables/charts can push content onto new pages as they're drawn.
      const doc = new PDFDocumentImpl({ margin: 50, bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      drawCoverPage(doc, request);
      doc.addPage();

      for (const section of request.sections) {
        drawSectionHeading(doc, section.heading);
        const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

        if (section.paragraphs && section.paragraphs.length > 0) {
          doc.y = drawParagraphs(doc, section.paragraphs, doc.page.margins.left, doc.y, contentWidth);
        }

        if (section.chart) {
          // drawChart returns the y position immediately below the chart it
          // drew — used here (unlike before) so the table that follows
          // starts below the chart instead of overlapping it.
          doc.y = drawChart(doc, section.chart, doc.x, doc.y, contentWidth);
          doc.moveDown(0.5);
        }

        if (section.cards) {
          doc.y =
            section.cards.length === 0
              ? emptyStateText(doc, 'No data available.', doc.page.margins.left, doc.y)
              : drawCards(doc, section.cards, doc.page.margins.left, doc.y, contentWidth);
        } else if (section.rows.length === 0) {
          if (!section.paragraphs || section.paragraphs.length === 0) {
            doc.y = emptyStateText(doc, 'No data available.', doc.page.margins.left, doc.y);
          }
        } else {
          doc.y = drawTable(doc, section.rows, doc.page.margins.left, doc.y, contentWidth);
        }
        doc.moveDown();
      }

      addFooters(doc);
      doc.end();
    });
  }
}

function drawCoverPage(doc: PDFDocument, request: PdfReportRequest): void {
  const bandHeight = 180;
  doc.rect(0, 0, doc.page.width, bandHeight).fill(BRAND_COLOR);

  // The same teal square + "S" wordmark used in the web app's sidebar and
  // login page — one consistent brand mark across the product, not a
  // separate logo invented just for PDFs.
  doc.roundedRect(50, 50, 32, 32, 6).fill('#ffffff');
  doc
    .fillColor(BRAND_COLOR)
    .font('Helvetica-Bold')
    .fontSize(16)
    .text('S', 50, 60, { width: 32, align: 'center' });
  doc
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .fontSize(14)
    .text('STRATIQ', 92, 60, { characterSpacing: 1.5 });
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#ccfbf1')
    .text('Enterprise Business Intelligence & Decision Intelligence', 92, 78);

  doc
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .fontSize(28)
    .text(request.title, 50, 130, { width: doc.page.width - 100 });

  const generatedDate = new Date(request.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc
    .fillColor(HEADING_COLOR)
    .font('Helvetica')
    .fontSize(11)
    .text(`Prepared ${generatedDate}`, 50, bandHeight + 30);
  doc
    .fillColor(MUTED_COLOR)
    .fontSize(9)
    .text(
      'This report is generated directly from your organization’s current dataset and analysis pipeline. ' +
        'All figures reflect the most recently processed data version.',
      50,
      bandHeight + 52,
      { width: doc.page.width - 100 },
    );
  doc.fillColor(BODY_COLOR);
}

function drawSectionHeading(doc: PDFDocument, heading: string): void {
  // Defensive: if the previous section's content-height estimate ever
  // drifts from what actually got drawn (see pdf-card-helpers.ts), doc.y can
  // land past the bottom margin here. Catching it explicitly avoids
  // PDFKit's own implicit auto-pagination — which inserts a page without
  // updating callers' cursor tracking — silently desyncing the page count
  // addFooters() later stamps against.
  if (doc.y > doc.page.height - doc.page.margins.bottom - 30) {
    doc.addPage();
  }
  const startY = doc.y;
  doc.rect(doc.page.margins.left, startY, 4, 16).fill(BRAND_LIGHT);
  doc
    .fillColor(HEADING_COLOR)
    .font('Helvetica-Bold')
    .fontSize(13)
    .text(heading, doc.page.margins.left + 12, startY);
  doc.fillColor(BODY_COLOR).font('Helvetica');
  doc.moveDown(0.6);
}

// Runs once after all content is drawn (see bufferPages above) — draws a
// thin rule plus "Page X of Y" on every page except the cover, which
// intentionally carries no footer.
function addFooters(doc: PDFDocument): void {
  const range = doc.bufferedPageRange();
  const contentPageCount = range.count - 1;

  for (let i = range.start + 1; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const originalBottomMargin = doc.page.margins.bottom;
    const footerY = doc.page.height - originalBottomMargin + 18;
    // footerY sits inside the bottom margin (by design — it's below the
    // normal content area), but PDFKit's own auto-pagination triggers on
    // *any* .text() call past `page.height - margins.bottom`, even ones
    // with `lineBreak: false` and an explicit y. Without this, drawing the
    // footer on every content page silently appended one extra blank page
    // per page (bufferedPageRange().count climbs on every call below) —
    // confirmed by isolated repro against pdfkit directly. Zeroing the
    // margin for the duration of the footer draw keeps it inside PDFKit's
    // idea of the page and prevents that.
    doc.page.margins.bottom = 0;
    doc
      .strokeColor('#e2e8f0')
      .lineWidth(0.5)
      .moveTo(doc.page.margins.left, footerY - 8)
      .lineTo(doc.page.width - doc.page.margins.right, footerY - 8)
      .stroke();
    doc
      .fontSize(8)
      .fillColor(MUTED_COLOR)
      .font('Helvetica')
      .text('StratIQ — Confidential', doc.page.margins.left, footerY, { lineBreak: false });
    doc.text(`Page ${i - range.start} of ${contentPageCount}`, doc.page.margins.left, footerY, {
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
      align: 'right',
      lineBreak: false,
    });
    doc.page.margins.bottom = originalBottomMargin;
  }
}
