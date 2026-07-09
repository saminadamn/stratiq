import type { InsightDto } from '@stratiq/shared';
import type { InsightRepository } from '../../../../domain/repositories/insight.repository.js';
import type { ResolveAnalyticsDatasetService } from '../../resolve-analytics-dataset.service.js';
import type { GenerateIntelligenceService } from '../generate-intelligence.service.js';
import { toInsightDto } from '../mappers.js';

const DEFAULT_LIMIT = 50;

// The read path for the Insight Timeline: it always makes sure the current
// dataset version has been analyzed (generation is a no-op if it already
// has been, per DatasetVersion immutability) before returning history.
export class GetInsightsUseCase {
  constructor(
    private readonly resolveDataset: ResolveAnalyticsDatasetService,
    private readonly generateIntelligence: GenerateIntelligenceService,
    private readonly insights: InsightRepository,
  ) {}

  async execute(
    organizationId: string,
    datasetId?: string,
    forceRefresh = false,
    limit = DEFAULT_LIMIT,
  ): Promise<InsightDto[]> {
    const context = await this.resolveDataset.resolve(organizationId, datasetId);
    await this.generateIntelligence.ensureGenerated(organizationId, context, forceRefresh);
    const rows = await this.insights.listByOrganization(organizationId, limit);
    return rows.map(toInsightDto);
  }
}
