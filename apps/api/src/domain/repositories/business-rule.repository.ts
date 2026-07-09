import type { BusinessRule } from '../entities/business-rule.entity.js';

export interface CreateBusinessRuleInput {
  organizationId: string;
  metricKey: string;
  name: string;
  comparator: BusinessRule['comparator'];
  thresholdValue: number;
  severity: BusinessRule['severity'];
  isDefault?: boolean | undefined;
}

export interface UpdateBusinessRuleInput {
  name?: string | undefined;
  thresholdValue?: number | undefined;
  severity?: BusinessRule['severity'] | undefined;
  isActive?: boolean | undefined;
}

export interface BusinessRuleRepository {
  create(input: CreateBusinessRuleInput): Promise<BusinessRule>;
  createMany(inputs: CreateBusinessRuleInput[]): Promise<void>;
  listByOrganization(organizationId: string): Promise<BusinessRule[]>;
  findByOrganizationAndId(organizationId: string, id: string): Promise<BusinessRule | null>;
  update(id: string, input: UpdateBusinessRuleInput): Promise<BusinessRule>;
  delete(id: string): Promise<void>;
  countByOrganization(organizationId: string): Promise<number>;
}
