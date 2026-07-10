import type { DecisionRecommendationDto } from '@stratiq/shared';
import { apiClient } from './api-client';

export interface DecisionIntelligenceResult {
  rootCauses: DecisionRecommendationDto[];
  recommendations: DecisionRecommendationDto[];
}

export function getDecisionIntelligence(organizationId: string): Promise<DecisionIntelligenceResult> {
  return apiClient.get<DecisionIntelligenceResult>(
    `/api/v1/organizations/${organizationId}/analytics/decisions`,
  );
}
