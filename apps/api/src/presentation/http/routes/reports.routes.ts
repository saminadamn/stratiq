import { Router } from 'express';
import type { ReportsControllerDeps } from '../controllers/reports.controller.js';
import { createReportsController } from '../controllers/reports.controller.js';
import { createAuthenticateMiddleware } from '../middleware/authenticate.middleware.js';
import { createRequireRoleMiddleware } from '../middleware/require-role.middleware.js';
import type { TokenService } from '../../../application/ports/token-service.port.js';
import type { MembershipRepository } from '../../../domain/repositories/membership.repository.js';

// Mounted at its own path (/organizations/:organizationId/reports), not
// nested under /analytics — reports are their own resource (the Download
// Center + Report History), same reasoning as dataset.routes.ts.
export function createReportsRoutes(
  deps: ReportsControllerDeps,
  tokenService: TokenService,
  memberships: MembershipRepository,
): Router {
  const router = Router({ mergeParams: true });
  const controller = createReportsController(deps);
  const authenticate = createAuthenticateMiddleware(tokenService);
  const requireMember = createRequireRoleMiddleware(memberships, 'VIEWER');

  router.use(authenticate);

  router.post('/generate', requireMember, controller.generateReport);
  router.get('/', requireMember, controller.listReports);
  router.get('/:reportId/download', requireMember, controller.downloadReport);

  return router;
}
