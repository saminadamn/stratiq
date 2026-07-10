import type { GenerateReportRequestDto, ReportDto } from '@stratiq/shared';
import { apiClient } from './api-client';

function base(organizationId: string): string {
  return `/api/v1/organizations/${organizationId}/reports`;
}

export function generateReport(
  organizationId: string,
  request: GenerateReportRequestDto,
): Promise<ReportDto> {
  return apiClient.post<ReportDto>(`${base(organizationId)}/generate`, request);
}

export async function listReports(organizationId: string): Promise<ReportDto[]> {
  const result = await apiClient.get<{ reports: ReportDto[] }>(base(organizationId));
  return result.reports;
}

export function downloadReport(organizationId: string, reportId: string): Promise<Blob> {
  return apiClient.getForBlob(`${base(organizationId)}/${reportId}/download`);
}
