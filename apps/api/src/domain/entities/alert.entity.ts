import type { AlertSeverity, AlertStatus } from '@stratiq/shared';

export interface Alert {
  id: string;
  organizationId: string;
  datasetVersionId: string;
  metricKey: string;
  ruleId: string | null;
  severity: AlertSeverity;
  message: string;
  currentValue: number;
  thresholdValue: number | null;
  status: AlertStatus;
  createdAt: Date;
  resolvedAt: Date | null;
}
