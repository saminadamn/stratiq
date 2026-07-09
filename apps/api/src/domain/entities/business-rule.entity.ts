import type { AlertSeverity, RuleComparator } from '@stratiq/shared';

export interface BusinessRule {
  id: string;
  organizationId: string;
  metricKey: string;
  name: string;
  comparator: RuleComparator;
  thresholdValue: number;
  severity: AlertSeverity;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
