import type { BusinessRule } from '../../../domain/entities/business-rule.entity.js';
import type { BusinessRuleRepository } from '../../../domain/repositories/business-rule.repository.js';
import { buildDefaultBusinessRules } from './default-business-rules.js';

// Called wherever rules are needed (rule listing, insight/alert generation)
// rather than at signup — keeps Sprint 1's SignupUseCase untouched while
// still giving every organization working defaults the first time it matters.
export async function ensureDefaultBusinessRules(
  businessRules: BusinessRuleRepository,
  organizationId: string,
): Promise<BusinessRule[]> {
  const existingCount = await businessRules.countByOrganization(organizationId);
  if (existingCount === 0) {
    await businessRules.createMany(buildDefaultBusinessRules(organizationId));
  }
  return businessRules.listByOrganization(organizationId);
}
