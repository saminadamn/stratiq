import type { DecisionRecommendationDto } from '@stratiq/shared';
import type { DecisionRecommendationRepository } from '../../../../domain/repositories/decision-recommendation.repository.js';
import type { ResolveAnalyticsDatasetService } from '../../resolve-analytics-dataset.service.js';
import type { GenerateDecisionIntelligenceService } from '../generate-decision-intelligence.service.js';
import { toDecisionRecommendationDto } from '../mappers.js';

export class GetDecisionIntelligenceUseCase {
  constructor(
    private readonly resolveDataset: ResolveAnalyticsDatasetService,
    private readonly generateDecisionIntelligence: GenerateDecisionIntelligenceService,
    private readonly decisionRecommendations: DecisionRecommendationRepository,
  ) {}

  async execute(
    organizationId: string,
    datasetId?: string,
    forceRefresh = false,
  ): Promise<DecisionRecommendationDto[]> {
    const context = await this.resolveDataset.resolve(organizationId, datasetId);
    await this.generateDecisionIntelligence.ensureGenerated(organizationId, context, forceRefresh);
    const rows = await this.decisionRecommendations.findByDatasetVersion(context.datasetVersionId);
    return rows.map(toDecisionRecommendationDto);
  }
}
