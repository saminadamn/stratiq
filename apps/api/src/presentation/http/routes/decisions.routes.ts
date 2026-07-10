import { Router } from 'express';
import type { DecisionsControllerDeps } from '../controllers/decisions.controller.js';
import { createDecisionsController } from '../controllers/decisions.controller.js';
import { createAuthenticateMiddleware } from '../middleware/authenticate.middleware.js';
import { createRequireRoleMiddleware } from '../middleware/require-role.middleware.js';
import type { TokenService } from '../../../application/ports/token-service.port.js';
import type { MembershipRepository } from '../../../domain/repositories/membership.repository.js';

// A fourth router mounted at the same /organizations/:organizationId/analytics
// prefix — see intelligence.routes.ts for why this doesn't collide.
export function createDecisionsRoutes(
  deps: DecisionsControllerDeps,
  tokenService: TokenService,
  memberships: MembershipRepository,
): Router {
  const router = Router({ mergeParams: true });
  const controller = createDecisionsController(deps);
  const authenticate = createAuthenticateMiddleware(tokenService);
  const requireMember = createRequireRoleMiddleware(memberships, 'VIEWER');

  router.use(authenticate);
  router.get('/decisions', requireMember, controller.getDecisions);

  return router;
}
