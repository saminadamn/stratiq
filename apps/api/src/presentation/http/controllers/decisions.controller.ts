import type { Request, Response } from 'express';
import { z } from 'zod';
import type { GetDecisionIntelligenceUseCase } from '../../../application/analytics/decision-intelligence/use-cases/get-decision-intelligence.use-case.js';
import { asyncHandler } from '../utils/async-handler.js';

const decisionsQuerySchema = z.object({
  datasetId: z.string().optional(),
  forceRefresh: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export interface DecisionsControllerDeps {
  getDecisionIntelligence: GetDecisionIntelligenceUseCase;
}

export function createDecisionsController(deps: DecisionsControllerDeps) {
  return {
    getDecisions: asyncHandler(async (req: Request, res: Response) => {
      const query = decisionsQuerySchema.parse(req.query);
      const result = await deps.getDecisionIntelligence.execute(
        req.params['organizationId'] as string,
        query.datasetId,
        query.forceRefresh,
      );
      res.status(200).json({
        rootCauses: result.filter((item) => item.category === 'ROOT_CAUSE'),
        recommendations: result.filter((item) => item.category === 'RECOMMENDATION'),
      });
    }),
  };
}
