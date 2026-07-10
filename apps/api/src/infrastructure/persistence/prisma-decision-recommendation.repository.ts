import {
  Prisma,
  type PrismaClient,
  type DecisionCategory as PrismaDecisionCategory,
  type RecommendationPriority as PrismaPriority,
} from '@prisma/client';
import type { DecisionCategory, RecommendationPriority } from '@stratiq/shared';
import type { DecisionRecommendation } from '../../domain/entities/decision-recommendation.entity.js';
import type {
  CreateDecisionRecommendationInput,
  DecisionRecommendationRepository,
} from '../../domain/repositories/decision-recommendation.repository.js';

type Row = Prisma.DecisionRecommendationGetPayload<Record<string, never>>;

function toDomain(row: Row): DecisionRecommendation {
  return {
    id: row.id,
    organizationId: row.organizationId,
    datasetVersionId: row.datasetVersionId,
    category: row.category as DecisionCategory,
    title: row.title,
    rootCause: row.rootCause,
    recommendationText: row.recommendationText,
    roiEstimate: row.roiEstimate,
    impactScore: row.impactScore,
    priority: row.priority as RecommendationPriority,
    actionPlanJson: row.actionPlanJson as Array<{ day: number; action: string }> | null,
    sourceRefsJson: row.sourceRefsJson as Record<string, unknown>,
    createdAt: row.createdAt,
  };
}

export class PrismaDecisionRecommendationRepository implements DecisionRecommendationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createMany(inputs: CreateDecisionRecommendationInput[]): Promise<void> {
    if (inputs.length === 0) {
      return;
    }
    await this.prisma.decisionRecommendation.createMany({
      data: inputs.map((input) => ({
        organizationId: input.organizationId,
        datasetVersionId: input.datasetVersionId,
        category: input.category as PrismaDecisionCategory,
        title: input.title,
        rootCause: input.rootCause,
        recommendationText: input.recommendationText,
        roiEstimate: input.roiEstimate,
        impactScore: input.impactScore,
        priority: input.priority as PrismaPriority,
        actionPlanJson: (input.actionPlanJson ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        sourceRefsJson: input.sourceRefsJson as Prisma.InputJsonValue,
      })),
      skipDuplicates: true,
    });
  }

  async findByDatasetVersion(datasetVersionId: string): Promise<DecisionRecommendation[]> {
    const rows = await this.prisma.decisionRecommendation.findMany({
      where: { datasetVersionId },
      orderBy: [{ impactScore: 'desc' }, { createdAt: 'asc' }],
    });
    return rows.map(toDomain);
  }
}
