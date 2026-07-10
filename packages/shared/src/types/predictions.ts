import type { TimeSeriesPointDto } from './analytics.js';

// Mirrors apps/api/prisma/schema.prisma's v1.0 additions — plain unions here
// so the frontend never depends on @prisma/client, same reasoning as
// intelligence.ts.
export const ML_MODEL_KEYS = ['CHURN', 'FORECAST', 'SEGMENTATION', 'RECOMMENDATION'] as const;
export type MlModelKey = (typeof ML_MODEL_KEYS)[number];

export interface FeatureImportanceDto {
  feature: string;
  importance: number;
}

export interface PredictionExplanationDto {
  method: string;
  topFeatures: FeatureImportanceDto[];
}

export interface ChurnPredictionDto {
  customerId: string;
  customerName: string | null;
  churnProbability: number;
  confidence: number;
  explanation: PredictionExplanationDto;
}

export interface SalesForecastPointDto extends TimeSeriesPointDto {
  isForecast: boolean;
}

export interface SalesForecastDto {
  modelVersion: number;
  confidence: number;
  history: TimeSeriesPointDto[];
  forecast: SalesForecastPointDto[];
  explanation: PredictionExplanationDto;
}

export interface CustomerSegmentDto {
  segmentId: number;
  label: string;
  customerCount: number;
  averageSpend: number;
  averageOrders: number;
}

export interface CustomerSegmentationDto {
  modelVersion: number;
  segments: CustomerSegmentDto[];
  assignments: Array<{ customerId: string; segmentId: number }>;
}

export interface ProductRecommendationDto {
  customerId: string;
  recommendedProductId: string;
  recommendedProductName: string | null;
  score: number;
  reason: string;
}

export interface ProductRecommendationsDto {
  modelVersion: number;
  recommendations: ProductRecommendationDto[];
}
