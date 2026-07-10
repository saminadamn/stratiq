import type { SalesForecastDto } from '@stratiq/shared';
import type { MlModelRepository } from '../../../../domain/repositories/ml-model.repository.js';
import type { PredictionRepository } from '../../../../domain/repositories/prediction.repository.js';
import type { MlServiceClient } from '../../../ports/ml-service-client.port.js';
import { calculateRevenue } from '../../kpis/revenue.kpi.js';
import { computeMetricMonthlySeries } from '../../intelligence/metric-time-series.js';
import type { ResolveAnalyticsDatasetService } from '../../resolve-analytics-dataset.service.js';

const DEFAULT_PERIODS_AHEAD = 3;

export class GetSalesForecastUseCase {
  constructor(
    private readonly resolveDataset: ResolveAnalyticsDatasetService,
    private readonly mlClient: MlServiceClient,
    private readonly mlModels: MlModelRepository,
    private readonly predictions: PredictionRepository,
  ) {}

  async execute(
    organizationId: string,
    datasetId?: string,
    forceRefresh = false,
  ): Promise<SalesForecastDto | null> {
    const context = await this.resolveDataset.resolve(organizationId, datasetId);

    if (!forceRefresh) {
      const existing = await this.predictions.findByDatasetVersion(context.datasetVersionId, 'FORECAST');
      const row = existing[0];
      if (row) {
        return {
          modelVersion: row.modelVersion,
          confidence: row.confidence,
          history: row.valueJson['history'] as SalesForecastDto['history'],
          forecast: row.valueJson['forecast'] as SalesForecastDto['forecast'],
          explanation: row.explanationJson as unknown as SalesForecastDto['explanation'],
        };
      }
    }

    // Node computes the monthly revenue series itself, reusing Sprint 3/4's
    // KPI engine — the ML service only ever sees a plain (period, value)
    // series, never raw rows or column mappings.
    const history = computeMetricMonthlySeries(context.rows, context.columns, calculateRevenue);
    if (history.length === 0) {
      return null;
    }

    const trained = await this.mlClient.predictForecast(
      organizationId,
      context.datasetVersionId,
      history,
      DEFAULT_PERIODS_AHEAD,
      forceRefresh,
    );

    const model = await this.mlModels.upsert({
      organizationId,
      datasetVersionId: context.datasetVersionId,
      modelKey: 'FORECAST',
      version: trained.modelVersion,
      algorithm: trained.algorithm,
      metricsJson: trained.metrics,
      artifactPath: `ml-service://FORECAST/${organizationId}/v${trained.modelVersion}`,
    });

    await this.predictions.createMany([
      {
        organizationId,
        datasetVersionId: context.datasetVersionId,
        modelKey: 'FORECAST',
        modelVersion: model.version,
        targetType: null,
        targetId: null,
        valueJson: {
          history: trained.result.history,
          forecast: trained.result.forecast,
        },
        confidence: trained.result.confidence,
        explanationJson: trained.result.explanation as unknown as Record<string, unknown>,
      },
    ]);

    return {
      modelVersion: model.version,
      confidence: trained.result.confidence,
      history: trained.result.history,
      forecast: trained.result.forecast,
      explanation: trained.result.explanation,
    };
  }
}
