import type { ProductRecommendationDto } from '@stratiq/shared';
import type { MlFeatureSnapshotRepository } from '../../../../domain/repositories/ml-feature-snapshot.repository.js';
import type { MlModelRepository } from '../../../../domain/repositories/ml-model.repository.js';
import type { PredictionRepository } from '../../../../domain/repositories/prediction.repository.js';
import type { MlServiceClient } from '../../../ports/ml-service-client.port.js';
import type { ResolveAnalyticsDatasetService } from '../../resolve-analytics-dataset.service.js';
import type { FeatureStoreService } from '../feature-store.service.js';

export class GetProductRecommendationsUseCase {
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
  ): Promise<ProductRecommendationDto[]> {
    const context = await this.resolveDataset.resolve(organizationId, datasetId);

    if (!forceRefresh) {
      const existing = await this.predictions.findByDatasetVersion(context.datasetVersionId, 'RECOMMENDATION');
      if (existing.length > 0) {
        return existing.map((prediction) => ({
          customerId: prediction.targetId as string,
          recommendedProductId: prediction.valueJson['recommendedProductId'] as string,
          recommendedProductName: (prediction.valueJson['recommendedProductName'] as string | null) ?? null,
          score: prediction.valueJson['score'] as number,
          reason: prediction.valueJson['reason'] as string,
        }));
      }
    }

    const productCatalog = this.featureStore.buildProductCatalog(context.rows, context.columns);
    const customerPurchases = this.featureStore.buildCustomerPurchases(context.rows, context.columns);
    if (productCatalog.length === 0 || customerPurchases.length === 0) {
      return [];
    }

    await this.mlFeatureSnapshots.saveMany(
      productCatalog.map((product) => ({
        organizationId,
        datasetVersionId: context.datasetVersionId,
        entityType: 'PRODUCT',
        entityId: product.productId,
        featuresJson: product as unknown as Record<string, unknown>,
      })),
    );

    const trained = await this.mlClient.predictRecommendations(
      organizationId,
      context.datasetVersionId,
      customerPurchases,
      productCatalog,
      forceRefresh,
    );

    const model = await this.mlModels.upsert({
      organizationId,
      datasetVersionId: context.datasetVersionId,
      modelKey: 'RECOMMENDATION',
      version: trained.modelVersion,
      algorithm: trained.algorithm,
      metricsJson: trained.metrics,
      artifactPath: `ml-service://RECOMMENDATION/${organizationId}/v${trained.modelVersion}`,
    });

    await this.predictions.createMany(
      trained.result.recommendations.map((recommendation) => ({
        organizationId,
        datasetVersionId: context.datasetVersionId,
        modelKey: 'RECOMMENDATION',
        modelVersion: model.version,
        targetType: 'CUSTOMER',
        targetId: recommendation.customerId,
        valueJson: {
          recommendedProductId: recommendation.recommendedProductId,
          recommendedProductName: recommendation.recommendedProductName,
          score: recommendation.score,
          reason: recommendation.reason,
        },
        confidence: recommendation.score,
        explanationJson: {},
      })),
    );

    return trained.result.recommendations;
  }
}
