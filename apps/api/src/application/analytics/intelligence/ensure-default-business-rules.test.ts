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
  it('seeds defaults when the organization has none yet', async () => {
    const createMany = vi.fn(async () => {});
    const countByOrganization = vi.fn(async () => 0);
    const listByOrganization = vi.fn(async () => [rule(), rule(), rule(), rule()]);

    const repository: BusinessRuleRepository = {
      create: vi.fn(),
      createMany,
      listByOrganization,
      findByOrganizationAndId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      countByOrganization,
    };

    const rules = await ensureDefaultBusinessRules(repository, 'org-1');

    expect(createMany).toHaveBeenCalledTimes(1);
    expect(rules).toHaveLength(4);
  });

  it('skips seeding when the organization already has rules', async () => {
    const createMany = vi.fn(async () => {});
    const countByOrganization = vi.fn(async () => 4);
    const listByOrganization = vi.fn(async () => [rule(), rule(), rule(), rule()]);

    const repository: BusinessRuleRepository = {
      create: vi.fn(),
      createMany,
      listByOrganization,
      findByOrganizationAndId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      countByOrganization,
    };

    await ensureDefaultBusinessRules(repository, 'org-1');

    expect(createMany).not.toHaveBeenCalled();
  });

  // Two concurrent requests for the same organization (e.g. the Insights and
  // Alerts panels mounting together) can both pass this function's
  // countByOrganization === 0 check before either has inserted anything, so
  // both may call createMany. That's expected and safe: deduplication is no
  // longer this function's job — it's a DB-level guard (a partial unique
  // index on (organizationId, name) WHERE isDefault, migration
  // 20260710150412, applied via createMany's skipDuplicates) that only a
  // real database can enforce, so it isn't exercised by this mocked-repository
  // unit test. See src/__tests__/integration/intelligence-flow.test.ts for
  // coverage against real Postgres.
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
