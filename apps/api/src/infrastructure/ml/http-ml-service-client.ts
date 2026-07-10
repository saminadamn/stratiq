import type {
  ChurnResult,
  ForecastResult,
  MlServiceClient,
  MlTrainedResult,
  RecommendationResult,
  SegmentationResult,
} from '../../application/ports/ml-service-client.port.js';
import type {
  CustomerFeatureVector,
  CustomerPurchaseRecord,
  ProductFeatureVector,
} from '../../application/analytics/ml/feature-store.service.js';

interface ChurnApiResponse {
  modelVersion: number;
  algorithm: string;
  metrics: Record<string, unknown>;
  predictions: ChurnResult['predictions'];
}

interface ForecastApiResponse {
  modelVersion: number;
  algorithm: string;
  metrics: Record<string, unknown>;
  confidence: number;
  history: Array<{ period: string; value: number }>;
  forecast: ForecastResult['forecast'];
  explanation: ForecastResult['explanation'];
}

interface SegmentationApiResponse {
  modelVersion: number;
  algorithm: string;
  metrics: Record<string, unknown>;
  segments: SegmentationResult['segments'];
  assignments: SegmentationResult['assignments'];
}

interface RecommendationApiResponse {
  modelVersion: number;
  algorithm: string;
  metrics: Record<string, unknown>;
  recommendations: RecommendationResult['recommendations'];
}

export class MlServiceUnavailableError extends Error {
  constructor(cause: unknown) {
    super('The ML service is unavailable.');
    this.name = 'MlServiceUnavailableError';
    this.cause = cause;
  }
}

// The only place that knows the ML service's HTTP contract. Everything else
// in apps/api depends on the MlServiceClient port instead.
export class HttpMlServiceClient implements MlServiceClient {
  constructor(private readonly baseUrl: string) {}

  async predictChurn(
    organizationId: string,
    datasetVersionId: string,
    customers: CustomerFeatureVector[],
    forceRetrain: boolean,
  ): Promise<MlTrainedResult<ChurnResult>> {
    const response = await this.post<ChurnApiResponse>('/predict/churn', {
      organizationId,
      datasetVersionId,
      forceRetrain,
      customers,
    });
    return {
      modelVersion: response.modelVersion,
      algorithm: response.algorithm,
      metrics: response.metrics,
      result: { predictions: response.predictions },
    };
  }

  async predictForecast(
    organizationId: string,
    datasetVersionId: string,
    history: Array<{ period: string; value: number }>,
    periodsAhead: number,
    forceRetrain: boolean,
  ): Promise<MlTrainedResult<ForecastResult>> {
    const response = await this.post<ForecastApiResponse>('/predict/forecast', {
      organizationId,
      datasetVersionId,
      forceRetrain,
      history,
      periodsAhead,
    });
    return {
      modelVersion: response.modelVersion,
      algorithm: response.algorithm,
      metrics: response.metrics,
      result: {
        confidence: response.confidence,
        history: response.history,
        forecast: response.forecast,
        explanation: response.explanation,
      },
    };
  }

  async predictSegments(
    organizationId: string,
    datasetVersionId: string,
    customers: CustomerFeatureVector[],
    forceRetrain: boolean,
  ): Promise<MlTrainedResult<SegmentationResult>> {
    const response = await this.post<SegmentationApiResponse>('/predict/segments', {
      organizationId,
      datasetVersionId,
      forceRetrain,
      customers,
    });
    return {
      modelVersion: response.modelVersion,
      algorithm: response.algorithm,
      metrics: response.metrics,
      result: { segments: response.segments, assignments: response.assignments },
    };
  }

  async predictRecommendations(
    organizationId: string,
    datasetVersionId: string,
    customerPurchases: CustomerPurchaseRecord[],
    productCatalog: ProductFeatureVector[],
    forceRetrain: boolean,
  ): Promise<MlTrainedResult<RecommendationResult>> {
    const response = await this.post<RecommendationApiResponse>('/predict/recommendations', {
      organizationId,
      datasetVersionId,
      forceRetrain,
      customerPurchases,
      productCatalog,
    });
    return {
      modelVersion: response.modelVersion,
      algorithm: response.algorithm,
      metrics: response.metrics,
      result: { recommendations: response.recommendations },
    };
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new MlServiceUnavailableError(error);
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new MlServiceUnavailableError(`${response.status} ${detail}`);
    }
    return (await response.json()) as T;
  }
}
