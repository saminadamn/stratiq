import PDFDocument from 'pdfkit';
import type {
  PdfReportRequest,
  ReportGenerator,
} from '../../application/ports/report-generator.port.js';
import { drawChart } from './pdf-chart-helpers.js';

// Formatted tabular report, not a pixel-perfect capture of the dashboard UI
// — rendering actual charts server-side would need a headless browser
// (Puppeteer) purely to rasterize a page, which is a heavy dependency for
// this project's scope. v1.0 embeds simple bar/line charts as native PDFKit
// vector primitives instead (see pdf-chart-helpers.ts). Full-fidelity PNG
// chart export is still handled client-side, from the browser's rendered
// SVG — see docs/ARCHITECTURE.md, "Export: CSV/PDF server-side, PNG
// client-side".
export class PdfKitReportGenerator implements ReportGenerator {
  async generatePdf(request: PdfReportRequest): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text(request.title, { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('gray').text(`Generated ${request.generatedAt}`);
      doc.fillColor('black');
      doc.moveDown();

      for (const section of request.sections) {
        doc.fontSize(14).text(section.heading);
        doc.moveDown(0.3);

        if (section.chart) {
          const chartWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
          drawChart(doc, section.chart, doc.x, doc.y, chartWidth);
          doc.moveDown();
        }

        if (section.rows.length === 0) {
          doc.fontSize(10).fillColor('gray').text('No data available.');
          doc.fillColor('black');
        } else {
          const headers = Object.keys(section.rows[0] as Record<string, string | number>);
          doc.fontSize(10).text(headers.join('   |   '));
          doc.moveDown(0.2);
          for (const row of section.rows) {
            doc.text(headers.map((header) => String(row[header])).join('   |   '));
          }
        }
        doc.moveDown();
      }

      doc.end();
    });
  }
}
