import type { CustomerSegmentationDto } from '@stratiq/shared';
import type { MlFeatureSnapshotRepository } from '../../../../domain/repositories/ml-feature-snapshot.repository.js';
import type { MlModelRepository } from '../../../../domain/repositories/ml-model.repository.js';
import type { PredictionRepository } from '../../../../domain/repositories/prediction.repository.js';
import type { MlServiceClient } from '../../../ports/ml-service-client.port.js';
import type { ResolveAnalyticsDatasetService } from '../../resolve-analytics-dataset.service.js';
import type { FeatureStoreService } from '../feature-store.service.js';

const SUMMARY_TARGET_TYPE = 'SEGMENT_SUMMARY';
const CUSTOMER_TARGET_TYPE = 'CUSTOMER';

export class GetCustomerSegmentsUseCase {
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
  ): Promise<CustomerSegmentationDto | null> {
    const context = await this.resolveDataset.resolve(organizationId, datasetId);

    if (!forceRefresh) {
      const existing = await this.predictions.findByDatasetVersion(
        context.datasetVersionId,
        'SEGMENTATION',
      );
      const summaryRow = existing.find((row) => row.targetType === SUMMARY_TARGET_TYPE);
      if (summaryRow) {
        const assignments = existing
          .filter((row) => row.targetType === CUSTOMER_TARGET_TYPE)
          .map((row) => ({
            customerId: row.targetId as string,
            segmentId: row.valueJson['segmentId'] as number,
          }));
        return {
          modelVersion: summaryRow.modelVersion,
          segments: summaryRow.valueJson['segments'] as CustomerSegmentationDto['segments'],
          assignments,
        };
      }
    }

    const customers = this.featureStore.buildCustomerFeatures(context.rows, context.columns);
    if (customers.length === 0) {
      return null;
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

    const trained = await this.mlClient.predictSegments(
      organizationId,
      context.datasetVersionId,
      customers,
      forceRefresh,
    );

    const model = await this.mlModels.upsert({
      organizationId,
      datasetVersionId: context.datasetVersionId,
      modelKey: 'SEGMENTATION',
      version: trained.modelVersion,
      algorithm: trained.algorithm,
      metricsJson: trained.metrics,
      artifactPath: `ml-service://SEGMENTATION/${organizationId}/v${trained.modelVersion}`,
    });

    await this.predictions.createMany([
      {
        organizationId,
        datasetVersionId: context.datasetVersionId,
        modelKey: 'SEGMENTATION',
        modelVersion: model.version,
        targetType: SUMMARY_TARGET_TYPE,
        targetId: null,
        valueJson: { segments: trained.result.segments },
        confidence: 1,
        explanationJson: {},
      },
      ...trained.result.assignments.map((assignment) => ({
        organizationId,
        datasetVersionId: context.datasetVersionId,
        modelKey: 'SEGMENTATION' as const,
        modelVersion: model.version,
        targetType: CUSTOMER_TARGET_TYPE,
        targetId: assignment.customerId,
        valueJson: { segmentId: assignment.segmentId },
        confidence: 1,
        explanationJson: {},
      })),
    ]);

    return {
      modelVersion: model.version,
      segments: trained.result.segments,
      assignments: trained.result.assignments,
    };
  }
}
