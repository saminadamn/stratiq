import type { DecisionRecommendationDto } from '@stratiq/shared';
import type { DecisionRecommendation } from '../../../domain/entities/decision-recommendation.entity.js';

export function toDecisionRecommendationDto(
  recommendation: DecisionRecommendation,
): DecisionRecommendationDto {
  return {
    id: recommendation.id,
    category: recommendation.category,
    title: recommendation.title,
    rootCause: recommendation.rootCause,
    recommendationText: recommendation.recommendationText,
    roiEstimate: recommendation.roiEstimate,
    impactScore: recommendation.impactScore,
    priority: recommendation.priority,
    actionPlan: recommendation.actionPlanJson as DecisionRecommendationDto['actionPlan'],
    createdAt: recommendation.createdAt.toISOString(),
    finding: recommendation.finding,
    businessImpact: recommendation.businessImpact,
    confidence: recommendation.confidence,
    severity: recommendation.severity,
    changePercent: recommendation.changePercent,
    metricKey: (recommendation.sourceRefsJson['metricKey'] as string | undefined) ?? null,
    driverMetricKey:
      (recommendation.sourceRefsJson['driverMetricKey'] as string | undefined) ?? null,
    team: recommendation.team,
  };
}
