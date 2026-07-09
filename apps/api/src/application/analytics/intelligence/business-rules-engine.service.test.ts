import { describe, expect, it } from 'vitest';
import type { BusinessRule } from '../../../domain/entities/business-rule.entity.js';
import { BusinessRulesEngineService } from './business-rules-engine.service.js';

const service = new BusinessRulesEngineService();

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

describe('BusinessRulesEngineService', () => {
  it('triggers a PERCENT_CHANGE_BELOW rule when the drop exceeds the threshold', () => {
    const triggered = service.evaluate([rule()], 'revenue', { currentValue: 1000, changePercent: -25 });
    expect(triggered).toHaveLength(1);
    expect(triggered[0]?.severity).toBe('WARNING');
  });

  it('does not trigger when the change is within the threshold', () => {
    const triggered = service.evaluate([rule()], 'revenue', { currentValue: 1000, changePercent: -5 });
    expect(triggered).toHaveLength(0);
  });

  it('ignores rules for a different metric key', () => {
    const triggered = service.evaluate([rule({ metricKey: 'profitMargin' })], 'revenue', {
      currentValue: 1000,
      changePercent: -50,
    });
    expect(triggered).toHaveLength(0);
  });

  it('ignores inactive rules', () => {
    const triggered = service.evaluate([rule({ isActive: false })], 'revenue', {
      currentValue: 1000,
      changePercent: -50,
    });
    expect(triggered).toHaveLength(0);
  });

  it('triggers a VALUE_BELOW rule based on currentValue rather than changePercent', () => {
    const negativeMargin = rule({
      metricKey: 'profitMargin',
      comparator: 'VALUE_BELOW',
      thresholdValue: 0,
      severity: 'CRITICAL',
    });
    const triggered = service.evaluate([negativeMargin], 'profitMargin', {
      currentValue: -5,
      changePercent: null,
    });
    expect(triggered).toHaveLength(1);
    expect(triggered[0]?.severity).toBe('CRITICAL');
  });

  it('does not trigger a percent-change rule when changePercent is null', () => {
    const triggered = service.evaluate([rule()], 'revenue', { currentValue: 1000, changePercent: null });
    expect(triggered).toHaveLength(0);
  });
});
