import type {
  CleaningMode,
  CleaningOperationType,
  CleanDatasetRequestDto,
  DatasetDto,
  DatasetHistoryDto,
  DatasetPreviewDto,
  UploadDatasetResponseDto,
  ValidationReportDto,
} from '@stratiq/shared';
import { apiClient } from './api-client';

function base(organizationId: string): string {
  return `/api/v1/organizations/${organizationId}/datasets`;
}

function buildUploadForm(input: {
  name?: string;
  file: File;
  cleaningMode: CleaningMode;
  operations?: CleaningOperationType[] | undefined;
}): FormData {
  const form = new FormData();
  form.append('file', input.file);
  if (input.name) {
    form.append('name', input.name);
  }
  form.append('cleaningMode', input.cleaningMode);
  if (input.operations && input.operations.length > 0) {
    form.append('operations', input.operations.join(','));
  }
  return form;
}

export async function listDatasets(organizationId: string): Promise<DatasetDto[]> {
  const result = await apiClient.get<{ datasets: DatasetDto[] }>(base(organizationId));
  return result.datasets;
}

export function getDataset(organizationId: string, datasetId: string): Promise<DatasetDto> {
  return apiClient.get<DatasetDto>(`${base(organizationId)}/${datasetId}`);
}

export function deleteDataset(organizationId: string, datasetId: string): Promise<void> {
  return apiClient.del(`${base(organizationId)}/${datasetId}`);
}

export function uploadDataset(
  organizationId: string,
  input: {
    name: string;
    file: File;
    cleaningMode: CleaningMode;
    operations?: CleaningOperationType[] | undefined;
  },
): Promise<UploadDatasetResponseDto> {
  return apiClient.post<UploadDatasetResponseDto>(
    `${base(organizationId)}/upload`,
    buildUploadForm(input),
  );
}

export function uploadDatasetVersion(
  organizationId: string,
  datasetId: string,
  input: {
    file: File;
    cleaningMode: CleaningMode;
    operations?: CleaningOperationType[] | undefined;
  },
): Promise<UploadDatasetResponseDto> {
  return apiClient.post<UploadDatasetResponseDto>(
    `${base(organizationId)}/${datasetId}/version`,
    buildUploadForm(input),
  );
}

export function cleanDataset(
  organizationId: string,
  datasetId: string,
  request: CleanDatasetRequestDto,
): Promise<UploadDatasetResponseDto> {
  return apiClient.post<UploadDatasetResponseDto>(
    `${base(organizationId)}/${datasetId}/clean`,
    request,
  );
}

export function previewDataset(
  organizationId: string,
  datasetId: string,
  options: { versionId?: string; page: number; pageSize: number },
): Promise<DatasetPreviewDto> {
  const query = new URLSearchParams({
    page: String(options.page),
    pageSize: String(options.pageSize),
  });
  if (options.versionId) {
    query.set('version', options.versionId);
  }
  return apiClient.get<DatasetPreviewDto>(`${base(organizationId)}/${datasetId}/preview?${query}`);
}

export function getValidationReport(
  organizationId: string,
  datasetId: string,
  versionId?: string,
): Promise<ValidationReportDto> {
  const query = versionId ? `?version=${encodeURIComponent(versionId)}` : '';
  return apiClient.get<ValidationReportDto>(`${base(organizationId)}/${datasetId}/quality${query}`);
}

export function getDatasetHistory(
  organizationId: string,
  datasetId: string,
): Promise<DatasetHistoryDto> {
  return apiClient.get<DatasetHistoryDto>(`${base(organizationId)}/${datasetId}/history`);
}
