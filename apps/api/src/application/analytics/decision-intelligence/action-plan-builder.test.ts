import { describe, expect, it } from 'vitest';
import { ActionPlanBuilder } from './action-plan-builder.js';

const builder = new ActionPlanBuilder();

describe('ActionPlanBuilder', () => {
  it('returns a fixed 30/60/90-day plan for a category', () => {
    const plan = builder.build('REVENUE_DECLINE_ORDERS');
    expect(plan.map((item) => item.day)).toEqual([30, 60, 90]);
  });

  it('returns the same plan every time for the same category (deterministic)', () => {
    expect(builder.build('HIGH_CHURN_RISK')).toEqual(builder.build('HIGH_CHURN_RISK'));
  });

  it('returns a different plan for a different category', () => {
    expect(builder.build('REVENUE_DECLINE_ORDERS')).not.toEqual(builder.build('REVENUE_DECLINE_AOV'));
  });
});
