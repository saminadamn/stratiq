import { Router } from 'express';
import type { OrganizationControllerDeps } from '../controllers/organization.controller.js';
import { createOrganizationController } from '../controllers/organization.controller.js';
import { createAuthenticateMiddleware } from '../middleware/authenticate.middleware.js';
import { createRequireRoleMiddleware } from '../middleware/require-role.middleware.js';
import type { TokenService } from '../../../application/ports/token-service.port.js';
import type { MembershipRepository } from '../../../domain/repositories/membership.repository.js';

export function createOrganizationRoutes(
  deps: OrganizationControllerDeps,
  tokenService: TokenService,
  memberships: MembershipRepository,
): Router {
  const router = Router();
  const controller = createOrganizationController(deps);
  const authenticate = createAuthenticateMiddleware(tokenService);
  // Viewing the roster only requires being a member — the lowest role rank.
  const requireMember = createRequireRoleMiddleware(memberships, 'VIEWER');

  router.get('/', authenticate, controller.listMine);
  router.get('/:organizationId/members', authenticate, requireMember, controller.listMembers);

  return router;
}
