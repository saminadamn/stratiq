import type { InsightSeverity } from './intelligence.js';

export const DECISION_CATEGORIES = ['ROOT_CAUSE', 'RECOMMENDATION'] as const;
export type DecisionCategory = (typeof DECISION_CATEGORIES)[number];

export const RECOMMENDATION_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type RecommendationPriority = (typeof RECOMMENDATION_PRIORITIES)[number];

export const CONFIDENCE_LEVELS = ['HIGH', 'MEDIUM', 'LOW'] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export const RECOMMENDATION_TEAMS = [
  'SALES',
  'MARKETING',
  'OPERATIONS',
  'CUSTOMER_SUCCESS',
  'GENERAL',
] as const;
export type RecommendationTeam = (typeof RECOMMENDATION_TEAMS)[number];

export interface ActionPlanItemDto {
  day: 30 | 60 | 90;
  action: string;
}

export interface DecisionRecommendationDto {
  id: string;
  category: DecisionCategory;
  title: string;
  rootCause: string | null;
  recommendationText: string | null;
  roiEstimate: number | null;
  impactScore: number;
  priority: RecommendationPriority;
  actionPlan: ActionPlanItemDto[] | null;
  createdAt: string;
  // Executive-readable headline + consequence sentence (ROOT_CAUSE rows only;
  // null on legacy rows generated before this field existed).
  finding: string | null;
  businessImpact: string | null;
  confidence: Confidence | null;
  severity: InsightSeverity | null;
  changePercent: number | null;
  // ROOT_CAUSE rows only — the metric that declined and (if found) which of
  // its known drivers moved most, for the Analyst diagnostic table.
  metricKey: string | null;
  driverMetricKey: string | null;
  // RECOMMENDATION rows only — which team the action is routed to.
  team: RecommendationTeam | null;
}
