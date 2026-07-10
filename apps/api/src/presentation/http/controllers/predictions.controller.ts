import type { Request, Response } from 'express';
import { z } from 'zod';
import type { GetChurnPredictionsUseCase } from '../../../application/analytics/ml/use-cases/get-churn-predictions.use-case.js';
import type { GetCustomerSegmentsUseCase } from '../../../application/analytics/ml/use-cases/get-customer-segments.use-case.js';
import type { GetProductRecommendationsUseCase } from '../../../application/analytics/ml/use-cases/get-product-recommendations.use-case.js';
import type { GetSalesForecastUseCase } from '../../../application/analytics/ml/use-cases/get-sales-forecast.use-case.js';
import { asyncHandler } from '../utils/async-handler.js';

const predictionQuerySchema = z.object({
  datasetId: z.string().optional(),
  forceRefresh: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export interface PredictionsControllerDeps {
  getChurnPredictions: GetChurnPredictionsUseCase;
  getSalesForecast: GetSalesForecastUseCase;
  getCustomerSegments: GetCustomerSegmentsUseCase;
  getProductRecommendations: GetProductRecommendationsUseCase;
}

export function createPredictionsController(deps: PredictionsControllerDeps) {
  return {
    getChurn: asyncHandler(async (req: Request, res: Response) => {
      const query = predictionQuerySchema.parse(req.query);
      const result = await deps.getChurnPredictions.execute(
        req.params['organizationId'] as string,
        query.datasetId,
        query.forceRefresh,
      );
      res.status(200).json({ predictions: result });
    }),

    getForecast: asyncHandler(async (req: Request, res: Response) => {
      const query = predictionQuerySchema.parse(req.query);
      const result = await deps.getSalesForecast.execute(
        req.params['organizationId'] as string,
        query.datasetId,
        query.forceRefresh,
      );
      res.status(200).json(result);
    }),

    getSegments: asyncHandler(async (req: Request, res: Response) => {
      const query = predictionQuerySchema.parse(req.query);
      const result = await deps.getCustomerSegments.execute(
        req.params['organizationId'] as string,
        query.datasetId,
        query.forceRefresh,
      );
      res.status(200).json(result);
    }),

    getRecommendations: asyncHandler(async (req: Request, res: Response) => {
      const query = predictionQuerySchema.parse(req.query);
      const result = await deps.getProductRecommendations.execute(
        req.params['organizationId'] as string,
        query.datasetId,
        query.forceRefresh,
      );
      res.status(200).json({ recommendations: result });
    }),
  };
}
