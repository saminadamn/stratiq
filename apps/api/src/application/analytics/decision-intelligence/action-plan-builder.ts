export type ActionPlanCategory =
  | 'REVENUE_DECLINE_ORDERS'
  | 'REVENUE_DECLINE_AOV'
  | 'REVENUE_DECLINE_GENERIC'
  | 'NEGATIVE_PROFIT_MARGIN'
  | 'SLOW_INVENTORY_TURNOVER'
  | 'HIGH_CHURN_RISK';

export interface ActionPlanItem {
  day: 30 | 60 | 90;
  action: string;
}

// One fixed 30/60/90-day plan per recommendation category — a lookup table,
// not generated text. Reproducible: the same category always yields the
// same plan, so two runs against the same insight produce the same output.
const ACTION_PLANS: Record<ActionPlanCategory, ActionPlanItem[]> = {
  REVENUE_DECLINE_ORDERS: [
    { day: 30, action: 'Launch a win-back email/SMS campaign targeting lapsed customers.' },
    { day: 60, action: 'Test a limited-time acquisition offer on the highest-converting channel.' },
    { day: 90, action: 'Reallocate marketing spend toward the channels that drove the most orders in the test.' },
  ],
  REVENUE_DECLINE_AOV: [
    { day: 30, action: 'Introduce bundle or cross-sell offers at checkout for top-selling products.' },
    { day: 60, action: 'Test a minimum-order free-shipping threshold above the current average order value.' },
    { day: 90, action: 'Roll out the highest-performing upsell offer across all customer segments.' },
  ],
  REVENUE_DECLINE_GENERIC: [
    { day: 30, action: 'Review the revenue trend by category and region to isolate where the decline is concentrated.' },
    { day: 60, action: 'Run a targeted promotion in the most-affected category or region.' },
    { day: 90, action: 'Reassess pricing and product mix based on the promotion results.' },
  ],
  NEGATIVE_PROFIT_MARGIN: [
    { day: 30, action: 'Audit cost-of-goods and supplier pricing for the lowest-margin products.' },
    { day: 60, action: 'Adjust pricing or discontinue the least profitable SKUs.' },
    { day: 90, action: 'Renegotiate supplier terms or source lower-cost alternatives for the remaining low-margin lines.' },
  ],
  SLOW_INVENTORY_TURNOVER: [
    { day: 30, action: 'Run a clearance promotion on the slowest-moving inventory.' },
    { day: 60, action: 'Lower reorder quantities for consistently slow-turning SKUs.' },
    { day: 90, action: 'Renegotiate supplier lead times to better match actual demand.' },
  ],
  HIGH_CHURN_RISK: [
    { day: 30, action: 'Reach out directly to the highest-risk customers with a personalized retention offer.' },
    { day: 60, action: 'Launch an automated re-engagement campaign for the broader at-risk segment.' },
    { day: 90, action: 'Review the onboarding/engagement flow for the behaviors most correlated with churn.' },
  ],
};

export class ActionPlanBuilder {
  build(category: ActionPlanCategory): ActionPlanItem[] {
    return ACTION_PLANS[category];
  }
}
