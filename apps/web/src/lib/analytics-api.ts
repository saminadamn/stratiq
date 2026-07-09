import type {
  AnalyticsFiltersDto,
  CreateSavedDashboardViewRequestDto,
  CustomerDashboardDto,
  DashboardType,
  ExecutiveDashboardDto,
  ExportDashboardRequestDto,
  InventoryDashboardDto,
  KpiSummaryDto,
  ProductDashboardDto,
  RevenueAnalyticsDto,
  SavedDashboardViewDto,
  UpdateSavedDashboardViewRequestDto,
} from '@stratiq/shared';
import { apiClient } from './api-client';

function base(organizationId: string): string {
  return `/api/v1/organizations/${organizationId}/analytics`;
}

function buildQuery(filters: AnalyticsFiltersDto): string {
  const params = new URLSearchParams();
  if (filters.datasetId) params.set('datasetId', filters.datasetId);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.category) params.set('category', filters.category);
  if (filters.region) params.set('region', filters.region);
  if (filters.productId) params.set('productId', filters.productId);
  if (filters.customerSegment) params.set('customerSegment', filters.customerSegment);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function getKpis(
  organizationId: string,
  filters: AnalyticsFiltersDto,
): Promise<KpiSummaryDto> {
  return apiClient.get<KpiSummaryDto>(`${base(organizationId)}/kpis${buildQuery(filters)}`);
}

export function getRevenueAnalytics(
  organizationId: string,
  filters: AnalyticsFiltersDto,
): Promise<RevenueAnalyticsDto> {
  return apiClient.get<RevenueAnalyticsDto>(
    `${base(organizationId)}/revenue${buildQuery(filters)}`,
  );
}

export function getExecutiveDashboard(
  organizationId: string,
  filters: AnalyticsFiltersDto,
): Promise<ExecutiveDashboardDto> {
  return apiClient.get<ExecutiveDashboardDto>(
    `${base(organizationId)}/dashboard/executive${buildQuery(filters)}`,
  );
}

export function getCustomerDashboard(
  organizationId: string,
  filters: AnalyticsFiltersDto,
): Promise<CustomerDashboardDto> {
  return apiClient.get<CustomerDashboardDto>(
    `${base(organizationId)}/dashboard/customer${buildQuery(filters)}`,
  );
}

export function getProductDashboard(
  organizationId: string,
  filters: AnalyticsFiltersDto,
): Promise<ProductDashboardDto> {
  return apiClient.get<ProductDashboardDto>(
    `${base(organizationId)}/dashboard/product${buildQuery(filters)}`,
  );
}

export function getInventoryDashboard(
  organizationId: string,
  filters: AnalyticsFiltersDto,
): Promise<InventoryDashboardDto> {
  return apiClient.get<InventoryDashboardDto>(
    `${base(organizationId)}/dashboard/inventory${buildQuery(filters)}`,
  );
}

export function exportDashboard(
  organizationId: string,
  request: ExportDashboardRequestDto,
): Promise<Blob> {
  return apiClient.postForBlob(`${base(organizationId)}/export`, request);
}

export async function listSavedViews(
  organizationId: string,
  dashboardType?: DashboardType,
): Promise<SavedDashboardViewDto[]> {
  const query = dashboardType ? `?dashboardType=${dashboardType}` : '';
  const result = await apiClient.get<{ views: SavedDashboardViewDto[] }>(
    `${base(organizationId)}/views${query}`,
  );
  return result.views;
}

export function createSavedView(
  organizationId: string,
  request: CreateSavedDashboardViewRequestDto,
): Promise<SavedDashboardViewDto> {
  return apiClient.post<SavedDashboardViewDto>(`${base(organizationId)}/views`, request);
}

export function deleteSavedView(organizationId: string, viewId: string): Promise<void> {
  return apiClient.del(`${base(organizationId)}/views/${viewId}`);
}

export function updateSavedView(
  organizationId: string,
  viewId: string,
  request: UpdateSavedDashboardViewRequestDto,
): Promise<SavedDashboardViewDto> {
  return apiClient.patch<SavedDashboardViewDto>(`${base(organizationId)}/views/${viewId}`, request);
}
