import type { TimeSeriesPointDto } from './analytics.js';

// Mirrors apps/api/prisma/schema.prisma's Sprint 4 additions — plain unions
// here so the frontend never depends on @prisma/client, same reasoning as
// roles.ts/dataset.ts/analytics.ts.
export const METRIC_CATEGORIES = [
  'REVENUE',
  'PROFITABILITY',
  'CUSTOMER',
  'PRODUCT',
  'INVENTORY',
  'GROWTH',
] as const;
export type MetricCategory = (typeof METRIC_CATEGORIES)[number];

export const METRIC_UNITS = ['CURRENCY', 'PERCENTAGE', 'COUNT', 'RATIO'] as const;
export type MetricUnit = (typeof METRIC_UNITS)[number];

export const METRIC_REFRESH_POLICIES = ['REALTIME', 'DAILY', 'ON_DATASET_UPLOAD'] as const;
export type MetricRefreshPolicy = (typeof METRIC_REFRESH_POLICIES)[number];

export const TREND_DIRECTIONS = ['INCREASING', 'STABLE', 'DECLINING', 'SEASONAL'] as const;
export type TrendDirection = (typeof TREND_DIRECTIONS)[number];

export const INSIGHT_SEVERITIES = ['INFO', 'WARNING', 'CRITICAL'] as const;
export type InsightSeverity = (typeof INSIGHT_SEVERITIES)[number];

export const ALERT_SEVERITIES = ['INFORMATIONAL', 'WARNING', 'CRITICAL'] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const ALERT_STATUSES = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

export const RULE_COMPARATORS = [
  'VALUE_ABOVE',
  'VALUE_BELOW',
  'PERCENT_CHANGE_ABOVE',
  'PERCENT_CHANGE_BELOW',
] as const;
export type RuleComparator = (typeof RULE_COMPARATORS)[number];

export const BENCHMARK_PERIODS = ['MONTH', 'QUARTER', 'YEAR'] as const;
export type BenchmarkPeriod = (typeof BENCHMARK_PERIODS)[number];

export interface MetricDefinitionDto {
  key: string;
  name: string;
  description: string;
  category: MetricCategory;
  formula: string;
  unit: MetricUnit;
  owner: string;
  refreshPolicy: MetricRefreshPolicy;
}

export interface TrendOutlierDto {
  period: string;
  value: number;
  zScore: number;
}

export interface TrendAnalysisDto {
  metricKey: string;
  direction: TrendDirection;
  averageChangePercent: number | null;
  series: TimeSeriesPointDto[];
  outliers: TrendOutlierDto[];
}

export interface BenchmarkResultDto {
  metricKey: string;
  period: BenchmarkPeriod;
  currentPeriodLabel: string;
  previousPeriodLabel: string;
  currentValue: number | null;
  previousValue: number | null;
  changeAbsolute: number | null;
  changePercent: number | null;
}

export interface InsightDto {
  id: string;
  metricKey: string;
  title: string;
  narrative: string;
  trend: TrendDirection | null;
  severity: InsightSeverity;
  currentValue: number;
  previousValue: number | null;
  changePercent: number | null;
  createdAt: string;
}

export interface AlertDto {
  id: string;
  metricKey: string;
  ruleId: string | null;
  severity: AlertSeverity;
  message: string;
  currentValue: number;
  thresholdValue: number | null;
  status: AlertStatus;
  createdAt: string;
  resolvedAt: string | null;
}

export interface BusinessRuleDto {
  id: string;
  metricKey: string;
  name: string;
  comparator: RuleComparator;
  thresholdValue: number;
  severity: AlertSeverity;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBusinessRuleRequestDto {
  metricKey: string;
  name: string;
  comparator: RuleComparator;
  thresholdValue: number;
  severity: AlertSeverity;
}

export interface UpdateBusinessRuleRequestDto {
  name?: string | undefined;
  thresholdValue?: number | undefined;
  severity?: AlertSeverity | undefined;
  isActive?: boolean | undefined;
}
