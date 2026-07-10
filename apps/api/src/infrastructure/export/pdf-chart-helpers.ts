import type PDFDocumentClass from 'pdfkit';
import type { PdfChartSpec } from '../../application/ports/report-generator.port.js';

type PDFDocument = InstanceType<typeof PDFDocumentClass>;

const CHART_HEIGHT = 140;
const AXIS_COLOR = '#94a3b8';
const BAR_COLOR = '#0d9488'; // teal-600 — matches the app's brand accent
const LINE_COLOR = '#0d9488';
const LABEL_FONT_SIZE = 7;

// Simple vector charts drawn directly with PDFKit's rect/line primitives —
// deliberately not a rasterized screenshot of the frontend's recharts
// output. Rendering a real browser page server-side (Puppeteer/canvas) just
// to capture a chart image is a heavy dependency for what these reports
// need: a handful of bars or a trend line over already-aggregated data (see
// docs/ARCHITECTURE.md's Module 3 decision).
export function drawChart(
  doc: PDFDocument,
  chart: PdfChartSpec,
  x: number,
  y: number,
  width: number,
): number {
  if (chart.data.length === 0) {
    return y;
  }
  return chart.type === 'bar'
    ? drawBarChart(doc, chart.data, x, y, width)
    : drawLineChart(doc, chart.data, x, y, width);
}

function drawBarChart(
  doc: PDFDocument,
  data: PdfChartSpec['data'],
  x: number,
  y: number,
  width: number,
): number {
  const maxValue = Math.max(...data.map((point) => point.value), 1);
  const barGap = 8;
  const barWidth = Math.max(4, (width - barGap * (data.length - 1)) / data.length);
  const chartBottom = y + CHART_HEIGHT;

  doc
    .strokeColor(AXIS_COLOR)
    .lineWidth(1)
    .moveTo(x, chartBottom)
    .lineTo(x + width, chartBottom)
    .stroke();

  data.forEach((point, index) => {
    const barHeight = (point.value / maxValue) * (CHART_HEIGHT - 20);
    const barX = x + index * (barWidth + barGap);
    const barY = chartBottom - barHeight;
    doc.rect(barX, barY, barWidth, barHeight).fill(BAR_COLOR);
    doc
      .fillColor('#000000')
      .fontSize(LABEL_FONT_SIZE)
      .text(truncateLabel(point.label), barX, chartBottom + 2, {
        width: barWidth + barGap,
        align: 'center',
      });
  });

  doc.fillColor('#000000');
  return chartBottom + 16;
}

function drawLineChart(
  doc: PDFDocument,
  data: PdfChartSpec['data'],
  x: number,
  y: number,
  width: number,
): number {
  const maxValue = Math.max(...data.map((point) => point.value), 1);
  const minValue = Math.min(...data.map((point) => point.value), 0);
  const range = maxValue - minValue || 1;
  const chartBottom = y + CHART_HEIGHT;
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;

  doc
    .strokeColor(AXIS_COLOR)
    .lineWidth(1)
    .moveTo(x, chartBottom)
    .lineTo(x + width, chartBottom)
    .stroke();

  doc.strokeColor(LINE_COLOR).lineWidth(1.5);
  data.forEach((point, index) => {
    const pointX = x + index * stepX;
    const pointY = chartBottom - ((point.value - minValue) / range) * (CHART_HEIGHT - 20);
    if (index === 0) {
      doc.moveTo(pointX, pointY);
    } else {
      doc.lineTo(pointX, pointY);
    }
  });
  doc.stroke();

  data.forEach((point, index) => {
    const pointX = x + index * stepX;
    doc
      .fillColor('#000000')
      .fontSize(LABEL_FONT_SIZE)
      .text(truncateLabel(point.label), pointX - 15, chartBottom + 2, {
        width: 30,
        align: 'center',
      });
  });

  doc.fillColor('#000000');
  return chartBottom + 16;
}

function truncateLabel(label: string): string {
  return label.length > 10 ? `${label.slice(0, 9)}…` : label;
}
