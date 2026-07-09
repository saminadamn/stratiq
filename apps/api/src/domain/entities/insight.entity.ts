import type { InsightSeverity, TrendDirection } from '@stratiq/shared';

export interface Insight {
  id: string;
  organizationId: string;
  datasetVersionId: string;
  metricKey: string;
  title: string;
  narrative: string;
  trend: TrendDirection | null;
  severity: InsightSeverity;
  currentValue: number;
  previousValue: number | null;
  changePercent: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}
