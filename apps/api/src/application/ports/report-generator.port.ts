export interface PdfChartSpec {
  type: 'bar' | 'line';
  data: Array<{ label: string; value: number }>;
}

// A labeled finding/recommendation block — the executive-readable
// alternative to a data-table row, used for Key Findings and Recommendations
// sections (see report-builder.service.ts's buildRecommendationReport()).
export interface PdfCardSpec {
  title: string;
  badge?: { label: string; color: string } | undefined;
  body?: string | undefined;
  // Small label/value pairs rendered in a row beneath the body — e.g.
  // Owner/Expected Impact/Timeline/Confidence.
  fields?: Array<{ label: string; value: string }> | undefined;
}

export interface PdfReportSection {
  heading: string;
  // Prose paragraphs, rendered before rows/cards — used for an Executive
  // Summary section instead of a table.
  paragraphs?: string[] | undefined;
  // Structured cards, rendered instead of the row table when present.
  cards?: PdfCardSpec[] | undefined;
  rows: Array<Record<string, string | number>>;
  // v1.0: Executive Reporting embeds simple charts where appropriate — see
  // infrastructure/export/pdf-chart-helpers.ts for why these are drawn as
  // native PDFKit vector primitives rather than rasterized via a headless
  // browser.
  chart?: PdfChartSpec | undefined;
}

export interface PdfReportRequest {
  title: string;
  generatedAt: string;
  sections: PdfReportSection[];
}

// Use cases depend on this port, not on pdfkit directly — same Dependency
// Inversion pattern as FileStorage/TokenService/AnalyticsCache.
export interface ReportGenerator {
  generatePdf(request: PdfReportRequest): Promise<Buffer>;
}
