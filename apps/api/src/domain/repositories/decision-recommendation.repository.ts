import type { DecisionCategory, RecommendationPriority } from '@stratiq/shared';
import type { DecisionRecommendation } from '../entities/decision-recommendation.entity.js';

export interface CreateDecisionRecommendationInput {
  organizationId: string;
  datasetVersionId: string;
  category: DecisionCategory;
  title: string;
  rootCause: string | null;
  recommendationText: string | null;
  roiEstimate: number | null;
  impactScore: number;
  priority: RecommendationPriority;
  actionPlanJson: Array<{ day: number; action: string }> | null;
  sourceRefsJson: Record<string, unknown>;
}

export interface DecisionRecommendationRepository {
  // Backed by @@unique([organizationId, datasetVersionId, title]) with
  // skipDuplicates — the DB-level guard, not an in-process lock.
  createMany(inputs: CreateDecisionRecommendationInput[]): Promise<void>;
  findByDatasetVersion(datasetVersionId: string): Promise<DecisionRecommendation[]>;
}
