import type {
  ChurnPredictionDto,
  CustomerSegmentationDto,
  ProductRecommendationDto,
  SalesForecastDto,
} from '@stratiq/shared';
import { apiClient } from './api-client';

function base(organizationId: string): string {
  return `/api/v1/organizations/${organizationId}/analytics/predictions`;
}

export async function getChurnPredictions(organizationId: string): Promise<ChurnPredictionDto[]> {
  const result = await apiClient.get<{ predictions: ChurnPredictionDto[] }>(
    `${base(organizationId)}/churn`,
  );
  return result.predictions;
}

export function getSalesForecast(organizationId: string): Promise<SalesForecastDto | null> {
  return apiClient.get<SalesForecastDto | null>(`${base(organizationId)}/forecast`);
}

export function getCustomerSegments(
  organizationId: string,
): Promise<CustomerSegmentationDto | null> {
  return apiClient.get<CustomerSegmentationDto | null>(`${base(organizationId)}/segments`);
}

export async function getProductRecommendations(
  organizationId: string,
): Promise<ProductRecommendationDto[]> {
  const result = await apiClient.get<{ recommendations: ProductRecommendationDto[] }>(
    `${base(organizationId)}/recommendations`,
  );
  return result.recommendations;
}
