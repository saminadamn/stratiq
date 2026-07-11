import type { ReportStatus, ReportType } from '@stratiq/shared';
import type { Report } from '../entities/report.entity.js';

export interface CreateReportInput {
  organizationId: string;
  datasetVersionId: string;
  type: ReportType;
  status: ReportStatus;
  generatedById: string;
}

export interface UpdateReportStatusInput {
  status: ReportStatus;
  fileName?: string;
  storagePath?: string;
  errorMessage?: string;
  completedAt?: Date;
}

export interface ReportRepository {
  create(input: CreateReportInput): Promise<Report>;
  updateStatus(id: string, input: UpdateReportStatusInput): Promise<Report>;
  listByOrganization(organizationId: string): Promise<Report[]>;
  findByOrganizationAndId(organizationId: string, id: string): Promise<Report | null>;
}
