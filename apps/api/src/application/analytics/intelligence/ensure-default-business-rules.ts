import type { BusinessRule } from '../../../domain/entities/business-rule.entity.js';
import type { BusinessRuleRepository } from '../../../domain/repositories/business-rule.repository.js';
import { buildDefaultBusinessRules } from './default-business-rules.js';

// Called wherever rules are needed (rule listing, insight/alert generation)
// rather than at signup — keeps Sprint 1's SignupUseCase untouched while
// still giving every organization working defaults the first time it matters.
//
// Two requests for the same organization (e.g. the Insights and Alerts
// panels mounting together) can both reach here before either has inserted
// anything. Rather than an in-process lock serializing the check-then-act
// (correct only within a single Node process — see v1-decision-recommendation
// dedup for the same class of bug found the hard way), this relies on a
// DB-level guard: a partial unique index on (organizationId, name) WHERE
// isDefault (see migration 20260710150412) plus skipDuplicates lets both
// requests insert concurrently and have the database silently drop whichever
// one loses the race, instead of needing coordination code at all.
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
