import { Router } from 'express';
import type { PredictionsControllerDeps } from '../controllers/predictions.controller.js';
import { createPredictionsController } from '../controllers/predictions.controller.js';
import { createAuthenticateMiddleware } from '../middleware/authenticate.middleware.js';
import { createRequireRoleMiddleware } from '../middleware/require-role.middleware.js';
import type { TokenService } from '../../../application/ports/token-service.port.js';
import type { MembershipRepository } from '../../../domain/repositories/membership.repository.js';

// A third router mounted at the same /organizations/:organizationId/analytics
// prefix as analytics.routes.ts and intelligence.routes.ts — see
// intelligence.routes.ts for why this doesn't collide.
export function createPredictionsRoutes(
  deps: PredictionsControllerDeps,
  tokenService: TokenService,
  memberships: MembershipRepository,
): Router {
  const router = Router({ mergeParams: true });
  const controller = createPredictionsController(deps);
  const authenticate = createAuthenticateMiddleware(tokenService);
  const requireMember = createRequireRoleMiddleware(memberships, 'VIEWER');

  router.use(authenticate);

  router.get('/predictions/churn', requireMember, controller.getChurn);
  router.get('/predictions/forecast', requireMember, controller.getForecast);
  router.get('/predictions/segments', requireMember, controller.getSegments);
  router.get('/predictions/recommendations', requireMember, controller.getRecommendations);

  return router;
}
