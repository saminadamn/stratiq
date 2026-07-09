import { Router } from 'express';
import type multer from 'multer';
import { createAnalyticsRoutes } from './analytics.routes.js';
import { createAuthRoutes } from './auth.routes.js';
import { createDatasetRoutes } from './dataset.routes.js';
import { createIntelligenceRoutes } from './intelligence.routes.js';
import { createOrganizationRoutes } from './organization.routes.js';
import type { AnalyticsControllerDeps } from '../controllers/analytics.controller.js';
import type { AuthControllerDeps } from '../controllers/auth.controller.js';
import type { DatasetControllerDeps } from '../controllers/dataset.controller.js';
import type { IntelligenceControllerDeps } from '../controllers/intelligence.controller.js';
import type { OrganizationControllerDeps } from '../controllers/organization.controller.js';
import type { TokenService } from '../../../application/ports/token-service.port.js';
import type { MembershipRepository } from '../../../domain/repositories/membership.repository.js';

export interface ApiRoutesDeps {
  auth: AuthControllerDeps;
  organizations: OrganizationControllerDeps;
  // Sprint 2 (Data Management & ETL).
  datasets: DatasetControllerDeps;
  datasetUpload: multer.Multer;
  // Sprint 3 (Business Intelligence & Analytics).
  analytics: AnalyticsControllerDeps;
  // Sprint 4 (Analytics Intelligence Layer).
  intelligence: IntelligenceControllerDeps;
  tokenService: TokenService;
  membershipRepository: MembershipRepository;
}

// v1 prefix from the start: a foundation meant to last should never have to
// retrofit versioning onto URLs already in use by a frontend or third party.
export function createApiRouter(deps: ApiRoutesDeps): Router {
  const router = Router();
  router.use('/auth', createAuthRoutes(deps.auth, deps.tokenService));
  router.use(
    '/organizations',
    createOrganizationRoutes(deps.organizations, deps.tokenService, deps.membershipRepository),
  );
  // Mounted at its own path (not nested inside the organizations router
  // above) so Sprint 1's organization.routes.ts never has to change to
  // accommodate Sprint 2 — Express still populates :organizationId from this
  // mount path directly.
  router.use(
    '/organizations/:organizationId/datasets',
    createDatasetRoutes(
      deps.datasets,
      deps.tokenService,
      deps.membershipRepository,
      deps.datasetUpload,
    ),
  );
  router.use(
    '/organizations/:organizationId/analytics',
    createAnalyticsRoutes(deps.analytics, deps.tokenService, deps.membershipRepository),
  );
  // Second router mounted at the same prefix as analytics — see
  // intelligence.routes.ts for why this doesn't collide with the routes
  // registered just above.
  router.use(
    '/organizations/:organizationId/analytics',
    createIntelligenceRoutes(deps.intelligence, deps.tokenService, deps.membershipRepository),
  );
  return router;
}
