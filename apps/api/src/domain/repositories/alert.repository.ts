import type { AlertStatus } from '@stratiq/shared';
import type { Alert } from '../entities/alert.entity.js';

export interface CreateAlertInput {
  organizationId: string;
  datasetVersionId: string;
  metricKey: string;
  ruleId: string | null;
  severity: Alert['severity'];
  message: string;
  currentValue: number;
  thresholdValue: number | null;
}

export interface AlertRepository {
  create(input: CreateAlertInput): Promise<Alert>;
  listByOrganization(organizationId: string, status?: AlertStatus): Promise<Alert[]>;
  findByOrganizationAndId(organizationId: string, id: string): Promise<Alert | null>;
  updateStatus(id: string, status: AlertStatus, resolvedAt?: Date): Promise<Alert>;
}
