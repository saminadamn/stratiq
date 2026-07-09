import { Router } from 'express';
import type { IntelligenceControllerDeps } from '../controllers/intelligence.controller.js';
import { createIntelligenceController } from '../controllers/intelligence.controller.js';
import { createAuthenticateMiddleware } from '../middleware/authenticate.middleware.js';
import { createRequireRoleMiddleware } from '../middleware/require-role.middleware.js';
import type { TokenService } from '../../../application/ports/token-service.port.js';
import type { MembershipRepository } from '../../../domain/repositories/membership.repository.js';

// Mounted at the exact same prefix as analytics.routes.ts
// (/organizations/:organizationId/analytics) via a second router.use() call
// in routes/index.ts — Express dispatches by full path match, so this can
// add /metrics, /trends, /benchmarks, /insights, /alerts, /rules without
// touching Sprint 3's analytics.routes.ts at all.
export function createIntelligenceRoutes(
  deps: IntelligenceControllerDeps,
  tokenService: TokenService,
  memberships: MembershipRepository,
): Router {
  const router = Router({ mergeParams: true });
  const controller = createIntelligenceController(deps);
  const authenticate = createAuthenticateMiddleware(tokenService);
  const requireMember = createRequireRoleMiddleware(memberships, 'VIEWER');
  const requireEditor = createRequireRoleMiddleware(memberships, 'MEMBER');

  router.use(authenticate);

  router.get('/metrics', requireMember, controller.getMetricsRegistry);
  router.get('/metrics/:metricKey', requireMember, controller.getMetricDefinition);

  router.get('/trends/:metricKey', requireMember, controller.getTrend);
  router.get('/benchmarks/:metricKey', requireMember, controller.getBenchmark);

  router.get('/insights', requireMember, controller.getInsights);

  router.get('/alerts', requireMember, controller.getAlerts);
  router.post('/alerts/:alertId/acknowledge', requireEditor, controller.acknowledgeAlert);
  router.post('/alerts/:alertId/resolve', requireEditor, controller.resolveAlert);

  router.get('/rules', requireMember, controller.listBusinessRules);
  router.post('/rules', requireEditor, controller.createBusinessRule);
  router.patch('/rules/:ruleId', requireEditor, controller.updateBusinessRule);
  router.delete('/rules/:ruleId', requireEditor, controller.deleteBusinessRule);

  return router;
}
