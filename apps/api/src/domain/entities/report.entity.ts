import type { ReportType } from '@stratiq/shared';

export interface Report {
  id: string;
  organizationId: string;
  datasetVersionId: string;
  type: ReportType;
  fileName: string;
  storagePath: string;
  generatedById: string;
  generatedByName: string;
  generatedAt: Date;
}
