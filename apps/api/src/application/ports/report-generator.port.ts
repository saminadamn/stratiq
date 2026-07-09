export interface PdfReportSection {
  heading: string;
  rows: Array<Record<string, string | number>>;
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
