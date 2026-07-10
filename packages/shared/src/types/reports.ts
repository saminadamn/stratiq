export const REPORT_TYPES = ['EXECUTIVE_SUMMARY', 'KPI', 'PREDICTION', 'RECOMMENDATION'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export interface GenerateReportRequestDto {
  type: ReportType;
  datasetId?: string | undefined;
}

export interface ReportDto {
  id: string;
  type: ReportType;
  fileName: string;
  generatedAt: string;
  generatedBy: { id: string; name: string };
}
