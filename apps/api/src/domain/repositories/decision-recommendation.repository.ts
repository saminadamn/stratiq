import type {
  Confidence,
  DecisionCategory,
  InsightSeverity,
  RecommendationPriority,
  RecommendationTeam,
} from '@stratiq/shared';
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
  finding: string | null;
  businessImpact: string | null;
  confidence: Confidence | null;
  severity: InsightSeverity | null;
  changePercent: number | null;
  team: RecommendationTeam | null;
}

export interface DecisionRecommendationRepository {
  // Backed by @@unique([organizationId, datasetVersionId, title]) with
  // skipDuplicates — the DB-level guard, not an in-process lock.
  createMany(inputs: CreateDecisionRecommendationInput[]): Promise<void>;
  findByDatasetVersion(datasetVersionId: string): Promise<DecisionRecommendation[]>;
  // Used to clear out legacy rows (generated before a narrative-field schema
  // change) before regenerating — see GenerateDecisionIntelligenceService.
  deleteByDatasetVersion(datasetVersionId: string): Promise<void>;
}
