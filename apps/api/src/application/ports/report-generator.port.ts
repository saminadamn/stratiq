export interface PdfChartSpec {
  type: 'bar' | 'line';
  data: Array<{ label: string; value: number }>;
}

export interface PdfReportSection {
  heading: string;
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
