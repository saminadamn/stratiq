import type { ReportType } from '@stratiq/shared';
import type { Report } from '../entities/report.entity.js';

export interface CreateReportInput {
  organizationId: string;
  datasetVersionId: string;
  type: ReportType;
  fileName: string;
  storagePath: string;
  generatedById: string;
}

export interface ReportRepository {
  create(input: CreateReportInput): Promise<Report>;
  listByOrganization(organizationId: string): Promise<Report[]>;
  findByOrganizationAndId(organizationId: string, id: string): Promise<Report | null>;
}
