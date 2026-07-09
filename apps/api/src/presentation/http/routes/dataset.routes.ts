import { Router } from 'express';
import type multer from 'multer';
import type { DatasetControllerDeps } from '../controllers/dataset.controller.js';
import { createDatasetController } from '../controllers/dataset.controller.js';
import { createAuthenticateMiddleware } from '../middleware/authenticate.middleware.js';
import { createRequireRoleMiddleware } from '../middleware/require-role.middleware.js';
import type { TokenService } from '../../../application/ports/token-service.port.js';
import type { MembershipRepository } from '../../../domain/repositories/membership.repository.js';

// Mounted at /organizations/:organizationId/datasets (see routes/index.ts) —
// reuses the Sprint 1 authenticate/requireRole middleware exactly as-is, so
// RBAC for datasets is enforced the same way as everything else in the app.
export function createDatasetRoutes(
  deps: DatasetControllerDeps,
  tokenService: TokenService,
  memberships: MembershipRepository,
  upload: multer.Multer,
): Router {
  const router = Router({ mergeParams: true });
  const controller = createDatasetController(deps);
  const authenticate = createAuthenticateMiddleware(tokenService);
  // Viewing requires only membership; mutating requires at least MEMBER;
  // deleting a dataset requires ADMIN.
  const requireMember = createRequireRoleMiddleware(memberships, 'VIEWER');
  const requireEditor = createRequireRoleMiddleware(memberships, 'MEMBER');
  const requireAdmin = createRequireRoleMiddleware(memberships, 'ADMIN');

  router.use(authenticate);

  router.post('/upload', requireEditor, upload.single('file'), controller.upload);
  router.get('/', requireMember, controller.list);
  router.get('/:datasetId', requireMember, controller.get);
  router.delete('/:datasetId', requireAdmin, controller.remove);
  router.post('/:datasetId/clean', requireEditor, controller.clean);
  router.get('/:datasetId/preview', requireMember, controller.preview);
  router.get('/:datasetId/quality', requireMember, controller.quality);
  router.get('/:datasetId/history', requireMember, controller.history);
  router.post(
    '/:datasetId/version',
    requireEditor,
    upload.single('file'),
    controller.uploadVersion,
  );

  return router;
}
