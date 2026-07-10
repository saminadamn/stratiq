export const DECISION_CATEGORIES = ['ROOT_CAUSE', 'RECOMMENDATION'] as const;
export type DecisionCategory = (typeof DECISION_CATEGORIES)[number];

export const RECOMMENDATION_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type RecommendationPriority = (typeof RECOMMENDATION_PRIORITIES)[number];

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
}
