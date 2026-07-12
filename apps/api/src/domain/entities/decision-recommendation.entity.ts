import type {
  Confidence,
  DecisionCategory,
  InsightSeverity,
  RecommendationPriority,
  RecommendationTeam,
} from '@stratiq/shared';

export interface DecisionRecommendation {
  id: string;
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
  createdAt: Date;
  finding: string | null;
  businessImpact: string | null;
  confidence: Confidence | null;
  severity: InsightSeverity | null;
  changePercent: number | null;
  team: RecommendationTeam | null;
}
