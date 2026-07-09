import type { AlertDto, AlertStatus } from '@stratiq/shared';
import type { AlertRepository } from '../../../../domain/repositories/alert.repository.js';
import type { ResolveAnalyticsDatasetService } from '../../resolve-analytics-dataset.service.js';
import type { GenerateIntelligenceService } from '../generate-intelligence.service.js';
import { toAlertDto } from '../mappers.js';

export class GetAlertsUseCase {
  constructor(
    private readonly resolveDataset: ResolveAnalyticsDatasetService,
    private readonly generateIntelligence: GenerateIntelligenceService,
    private readonly alerts: AlertRepository,
  ) {}

  async execute(
    organizationId: string,
    status?: AlertStatus,
    datasetId?: string,
    forceRefresh = false,
  ): Promise<AlertDto[]> {
    const context = await this.resolveDataset.resolve(organizationId, datasetId);
    await this.generateIntelligence.ensureGenerated(organizationId, context, forceRefresh);
    const rows = await this.alerts.listByOrganization(organizationId, status);
    return rows.map(toAlertDto);
  }
}
