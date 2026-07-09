import { Router } from 'express';
import type { AnalyticsControllerDeps } from '../controllers/analytics.controller.js';
import { createAnalyticsController } from '../controllers/analytics.controller.js';
import { createAuthenticateMiddleware } from '../middleware/authenticate.middleware.js';
import { createRequireRoleMiddleware } from '../middleware/require-role.middleware.js';
import type { TokenService } from '../../../application/ports/token-service.port.js';
import type { MembershipRepository } from '../../../domain/repositories/membership.repository.js';

// Mounted at /organizations/:organizationId/analytics (see routes/index.ts).
export function createAnalyticsRoutes(
  deps: AnalyticsControllerDeps,
  tokenService: TokenService,
  memberships: MembershipRepository,
): Router {
  const router = Router({ mergeParams: true });
  const controller = createAnalyticsController(deps);
  const authenticate = createAuthenticateMiddleware(tokenService);
  const requireMember = createRequireRoleMiddleware(memberships, 'VIEWER');
  const requireEditor = createRequireRoleMiddleware(memberships, 'MEMBER');

  router.use(authenticate);

  router.get('/kpis', requireMember, controller.getKpis);
  router.get('/revenue', requireMember, controller.getRevenue);
  router.get('/customers', requireMember, controller.getCustomers);
  router.get('/products', requireMember, controller.getProducts);
  router.get('/inventory', requireMember, controller.getInventory);

  router.get('/dashboard/executive', requireMember, controller.getExecutiveDashboard);
  // Same use cases as the plain endpoints above — see analytics.controller.ts.
  router.get('/dashboard/customer', requireMember, controller.getCustomers);
  router.get('/dashboard/product', requireMember, controller.getProducts);
  router.get('/dashboard/inventory', requireMember, controller.getInventory);

  router.post('/export', requireMember, controller.exportDashboard);

  router.post('/views', requireEditor, controller.createSavedView);
  router.get('/views', requireMember, controller.listSavedViews);
  router.get('/views/:viewId', requireMember, controller.getSavedView);
  router.patch('/views/:viewId', requireEditor, controller.updateSavedView);
  router.delete('/views/:viewId', requireEditor, controller.deleteSavedView);

  return router;
}
