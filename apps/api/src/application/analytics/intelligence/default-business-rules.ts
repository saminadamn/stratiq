import type { CreateBusinessRuleInput } from '../../../domain/repositories/business-rule.repository.js';

// Lazily seeded the first time rules are needed for an organization that has
// none yet (see BusinessRuleRepository.ensureDefaults / PrismaBusinessRuleRepository) —
// not seeded at signup, so Sprint 1's SignupUseCase never has to change.
// Marked isDefault so the frontend can distinguish "platform default" from
// "something a user configured," without that affecting evaluation at all.
export function buildDefaultBusinessRules(organizationId: string): CreateBusinessRuleInput[] {
  return [
    {
      organizationId,
      metricKey: 'revenue',
      name: 'Revenue decline warning',
      comparator: 'PERCENT_CHANGE_BELOW',
      thresholdValue: -10,
      severity: 'WARNING',
      isDefault: true,
    },
    {
      organizationId,
      metricKey: 'revenue',
      name: 'Revenue decline critical',
      comparator: 'PERCENT_CHANGE_BELOW',
      thresholdValue: -25,
      severity: 'CRITICAL',
      isDefault: true,
    },
    {
      organizationId,
      metricKey: 'profitMargin',
      name: 'Negative profit margin',
      comparator: 'VALUE_BELOW',
      thresholdValue: 0,
      severity: 'CRITICAL',
      isDefault: true,
    },
    {
      organizationId,
      metricKey: 'inventoryTurnover',
      name: 'Slow inventory turnover',
      comparator: 'VALUE_BELOW',
      thresholdValue: 1,
      severity: 'WARNING',
      isDefault: true,
    },
  ];
}
