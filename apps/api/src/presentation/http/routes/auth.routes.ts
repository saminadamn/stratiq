import { Router } from 'express';
import type { AuthControllerDeps } from '../controllers/auth.controller.js';
import { createAuthController } from '../controllers/auth.controller.js';
import { createAuthenticateMiddleware } from '../middleware/authenticate.middleware.js';
import type { TokenService } from '../../../application/ports/token-service.port.js';

export function createAuthRoutes(deps: AuthControllerDeps, tokenService: TokenService): Router {
  const router = Router();
  const controller = createAuthController(deps);
  const authenticate = createAuthenticateMiddleware(tokenService);

  router.post('/signup', controller.signup);
  router.post('/login', controller.login);
  router.post('/refresh', controller.refresh);
  router.post('/logout', controller.logout);
  router.get('/me', authenticate, controller.me);

  return router;
}
