import type { ChurnPredictionDto } from '@stratiq/shared';
import type { MlFeatureSnapshotRepository } from '../../../../domain/repositories/ml-feature-snapshot.repository.js';
import type { MlModelRepository } from '../../../../domain/repositories/ml-model.repository.js';
import type { PredictionRepository } from '../../../../domain/repositories/prediction.repository.js';
import type { MlServiceClient } from '../../../ports/ml-service-client.port.js';
import type { ResolveAnalyticsDatasetService } from '../../resolve-analytics-dataset.service.js';
import type { FeatureStoreService } from '../feature-store.service.js';

// Predictions are generated once per immutable dataset version and reused
// after — the same pattern Sprint 4 established for Insights/Alerts,
// applied here to ML predictions instead.
export class GetChurnPredictionsUseCase {
  constructor(
    private readonly resolveDataset: ResolveAnalyticsDatasetService,
    private readonly featureStore: FeatureStoreService,
    private readonly mlClient: MlServiceClient,
    private readonly mlModels: MlModelRepository,
    private readonly mlFeatureSnapshots: MlFeatureSnapshotRepository,
    private readonly predictions: PredictionRepository,
  ) {}

  async execute(
    organizationId: string,
    datasetId?: string,
    forceRefresh = false,
  ): Promise<ChurnPredictionDto[]> {
    const context = await this.resolveDataset.resolve(organizationId, datasetId);

    if (!forceRefresh) {
      const existing = await this.predictions.findByDatasetVersion(context.datasetVersionId, 'CHURN');
      if (existing.length > 0) {
        return existing.map((prediction) => ({
          customerId: prediction.targetId as string,
          customerName: (prediction.valueJson['customerName'] as string | null) ?? null,
          churnProbability: prediction.valueJson['churnProbability'] as number,
          confidence: prediction.confidence,
          explanation: prediction.explanationJson as unknown as ChurnPredictionDto['explanation'],
        }));
      }
    }

    const customers = this.featureStore.buildCustomerFeatures(context.rows, context.columns);
    if (customers.length === 0) {
      return [];
    }

    await this.mlFeatureSnapshots.saveMany(
      customers.map((customer) => ({
        organizationId,
        datasetVersionId: context.datasetVersionId,
        entityType: 'CUSTOMER',
        entityId: customer.customerId,
        featuresJson: customer as unknown as Record<string, unknown>,
      })),
    );

    const trained = await this.mlClient.predictChurn(
      organizationId,
      context.datasetVersionId,
      customers,
      forceRefresh,
    );

    const model = await this.mlModels.upsert({
      organizationId,
      datasetVersionId: context.datasetVersionId,
      modelKey: 'CHURN',
      version: trained.modelVersion,
      algorithm: trained.algorithm,
      metricsJson: trained.metrics,
      artifactPath: `ml-service://CHURN/${organizationId}/v${trained.modelVersion}`,
    });

    await this.predictions.createMany(
      trained.result.predictions.map((prediction) => ({
        organizationId,
        datasetVersionId: context.datasetVersionId,
        modelKey: 'CHURN',
        modelVersion: model.version,
        targetType: 'CUSTOMER',
        targetId: prediction.customerId,
        valueJson: {
          customerName: prediction.customerName,
          churnProbability: prediction.churnProbability,
        },
        confidence: prediction.confidence,
        explanationJson: prediction.explanation as unknown as Record<string, unknown>,
      })),
    );

    return trained.result.predictions;
  }
}
