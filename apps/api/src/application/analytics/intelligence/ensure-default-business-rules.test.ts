import { describe, expect, it, vi } from 'vitest';
import type { BusinessRule } from '../../../domain/entities/business-rule.entity.js';
import type { BusinessRuleRepository } from '../../../domain/repositories/business-rule.repository.js';
import { ensureDefaultBusinessRules } from './ensure-default-business-rules.js';

function rule(overrides: Partial<BusinessRule> = {}): BusinessRule {
  return {
    id: 'rule-1',
    organizationId: 'org-1',
    metricKey: 'revenue',
    name: 'Revenue decline warning',
    comparator: 'PERCENT_CHANGE_BELOW',
    thresholdValue: -10,
    severity: 'WARNING',
    isActive: true,
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('ensureDefaultBusinessRules', () => {
  it('seeds defaults only once when called concurrently for the same organization', async () => {
    // Simulates two requests (e.g. the Insights and Alerts panels mounting
    // together) both reading the pre-seed count before either has inserted
    // anything — the exact race that previously double-seeded defaults.
    let seededCount = 0;
    const createMany = vi.fn(async () => {
      seededCount = 4;
    });
    const countByOrganization = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return seededCount;
    });
    const listByOrganization = vi.fn(async () => (seededCount > 0 ? [rule(), rule(), rule(), rule()] : []));

    const repository: BusinessRuleRepository = {
      create: vi.fn(),
      createMany,
      listByOrganization,
      findByOrganizationAndId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      countByOrganization,
    };

    const [first, second] = await Promise.all([
      ensureDefaultBusinessRules(repository, 'org-1'),
      ensureDefaultBusinessRules(repository, 'org-1'),
    ]);

    expect(createMany).toHaveBeenCalledTimes(1);
    expect(first).toHaveLength(4);
    expect(second).toHaveLength(4);
  });

  it('does not serialize seeding across different organizations', async () => {
    const createMany = vi.fn(async () => {});
    const countByOrganization = vi.fn(async () => 0);
    const listByOrganization = vi.fn(async () => []);

    const repository: BusinessRuleRepository = {
      create: vi.fn(),
      createMany,
      listByOrganization,
      findByOrganizationAndId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      countByOrganization,
    };

    await Promise.all([
      ensureDefaultBusinessRules(repository, 'org-1'),
      ensureDefaultBusinessRules(repository, 'org-2'),
    ]);

    expect(createMany).toHaveBeenCalledTimes(2);
  });
});
