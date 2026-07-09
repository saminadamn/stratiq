import type { BusinessRule } from '../../../domain/entities/business-rule.entity.js';
import type { BusinessRuleRepository } from '../../../domain/repositories/business-rule.repository.js';
import { buildDefaultBusinessRules } from './default-business-rules.js';

// Two requests for the same organization (e.g. the Insights and Alerts
// panels mounting together) can both read countByOrganization === 0 before
// either has inserted anything, double-seeding the defaults. This in-process
// lock serializes the check-then-act so only the first caller actually
// seeds; later callers await that same in-flight promise instead of racing
// it. A single Node process serves this API (see the analytics cache in
// Sprint 3 for the same single-process assumption), so this is sufficient
// without a DB-level lock.
const inFlightSeeds = new Map<string, Promise<BusinessRule[]>>();

// Called wherever rules are needed (rule listing, insight/alert generation)
// rather than at signup — keeps Sprint 1's SignupUseCase untouched while
// still giving every organization working defaults the first time it matters.
export async function ensureDefaultBusinessRules(
  businessRules: BusinessRuleRepository,
  organizationId: string,
): Promise<BusinessRule[]> {
  const inFlight = inFlightSeeds.get(organizationId);
  if (inFlight) {
    return inFlight;
  }

  const seedPromise = (async () => {
    const existingCount = await businessRules.countByOrganization(organizationId);
    if (existingCount === 0) {
      await businessRules.createMany(buildDefaultBusinessRules(organizationId));
    }
    return businessRules.listByOrganization(organizationId);
  })().finally(() => inFlightSeeds.delete(organizationId));

  inFlightSeeds.set(organizationId, seedPromise);
  return seedPromise;
}
