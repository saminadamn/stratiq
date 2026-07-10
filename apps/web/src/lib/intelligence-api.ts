import type {
  AlertDto,
  AlertStatus,
  BenchmarkPeriod,
  BenchmarkResultDto,
  BusinessRuleDto,
  InsightDto,
  MetricDefinitionDto,
  TrendAnalysisDto,
} from '@stratiq/shared';
import { apiClient } from './api-client';

function base(organizationId: string): string {
  return `/api/v1/organizations/${organizationId}/analytics`;
}

export async function getMetricsRegistry(organizationId: string): Promise<MetricDefinitionDto[]> {
  const result = await apiClient.get<{ metrics: MetricDefinitionDto[] }>(
    `${base(organizationId)}/metrics`,
  );
  return result.metrics;
}

export function getTrend(
  organizationId: string,
  metricKey: string,
  datasetId?: string,
): Promise<TrendAnalysisDto> {
  const query = datasetId ? `?datasetId=${datasetId}` : '';
  return apiClient.get<TrendAnalysisDto>(`${base(organizationId)}/trends/${metricKey}${query}`);
}

export function getBenchmark(
  organizationId: string,
  metricKey: string,
  period: BenchmarkPeriod = 'MONTH',
  datasetId?: string,
): Promise<BenchmarkResultDto> {
  const params = new URLSearchParams({ period });
  if (datasetId) params.set('datasetId', datasetId);
  return apiClient.get<BenchmarkResultDto>(
    `${base(organizationId)}/benchmarks/${metricKey}?${params.toString()}`,
  );
}

export async function getInsights(organizationId: string, limit = 20): Promise<InsightDto[]> {
  const result = await apiClient.get<{ insights: InsightDto[] }>(
    `${base(organizationId)}/insights?limit=${limit}`,
  );
  return result.insights;
}

export async function getAlerts(organizationId: string, status?: AlertStatus): Promise<AlertDto[]> {
  const query = status ? `?status=${status}` : '';
  const result = await apiClient.get<{ alerts: AlertDto[] }>(
    `${base(organizationId)}/alerts${query}`,
  );
  return result.alerts;
}

export function acknowledgeAlert(organizationId: string, alertId: string): Promise<AlertDto> {
  return apiClient.post<AlertDto>(`${base(organizationId)}/alerts/${alertId}/acknowledge`);
}

export function resolveAlert(organizationId: string, alertId: string): Promise<AlertDto> {
  return apiClient.post<AlertDto>(`${base(organizationId)}/alerts/${alertId}/resolve`);
}

export async function listBusinessRules(organizationId: string): Promise<BusinessRuleDto[]> {
  const result = await apiClient.get<{ rules: BusinessRuleDto[] }>(`${base(organizationId)}/rules`);
  return result.rules;
}
