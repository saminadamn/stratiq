import type {
  ChurnPredictionDto,
  CustomerSegmentDto,
  PredictionExplanationDto,
  ProductRecommendationDto,
  SalesForecastPointDto,
} from '@stratiq/shared';
import type {
  CustomerFeatureVector,
  CustomerPurchaseRecord,
  ProductFeatureVector,
} from '../analytics/ml/feature-store.service.js';

export interface MlTrainedResult<T> {
  modelVersion: number;
  algorithm: string;
  metrics: Record<string, unknown>;
  result: T;
}

export interface ChurnResult {
  predictions: ChurnPredictionDto[];
}

export interface ForecastResult {
  confidence: number;
  history: Array<{ period: string; value: number }>;
  forecast: SalesForecastPointDto[];
  explanation: PredictionExplanationDto;
}

export interface SegmentationResult {
  segments: CustomerSegmentDto[];
  assignments: Array<{ customerId: string; segmentId: number }>;
}

export interface RecommendationResult {
  recommendations: ProductRecommendationDto[];
}

// Use cases depend on this port, not on the HTTP client directly — same
// Dependency Inversion pattern as FileStorage/TokenService/ReportGenerator.
// The ML service is stateless compute only: it never touches Postgres, so
// every method here sends already-computed features (from FeatureStoreService)
// rather than raw rows, and every method returns a result Node persists
// itself via Prisma (see docs/ARCHITECTURE.md's Module 1 decisions).
export interface MlServiceClient {
  predictChurn(
    organizationId: string,
    datasetVersionId: string,
    customers: CustomerFeatureVector[],
    forceRetrain: boolean,
  ): Promise<MlTrainedResult<ChurnResult>>;

  predictForecast(
    organizationId: string,
    datasetVersionId: string,
    history: Array<{ period: string; value: number }>,
    periodsAhead: number,
    forceRetrain: boolean,
  ): Promise<MlTrainedResult<ForecastResult>>;

  predictSegments(
    organizationId: string,
    datasetVersionId: string,
    customers: CustomerFeatureVector[],
    forceRetrain: boolean,
  ): Promise<MlTrainedResult<SegmentationResult>>;

  predictRecommendations(
    organizationId: string,
    datasetVersionId: string,
    customerPurchases: CustomerPurchaseRecord[],
    productCatalog: ProductFeatureVector[],
    forceRetrain: boolean,
  ): Promise<MlTrainedResult<RecommendationResult>>;
}
