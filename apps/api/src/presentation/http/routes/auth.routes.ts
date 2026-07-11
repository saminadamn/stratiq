import { Router } from 'express';
import type { Store } from 'express-rate-limit';
import type { AuthControllerDeps } from '../controllers/auth.controller.js';
import { createAuthController } from '../controllers/auth.controller.js';
import { createAuthenticateMiddleware } from '../middleware/authenticate.middleware.js';
import { createAuthRateLimiter } from '../middleware/rate-limit.middleware.js';
import type { TokenService } from '../../../application/ports/token-service.port.js';

export function createAuthRoutes(
  deps: AuthControllerDeps,
  tokenService: TokenService,
  authRateLimitStore?: Store,
): Router {
  const router = Router();
  const controller = createAuthController(deps);
  const authenticate = createAuthenticateMiddleware(tokenService);
  // Signup/login are the credential-stuffing/brute-force targets — a
  // tighter, dedicated limit on top of the global one (see
  // rate-limit.middleware.ts).
  const authRateLimiter = createAuthRateLimiter(authRateLimitStore);

  router.post('/signup', authRateLimiter, controller.signup);
  router.post('/login', authRateLimiter, controller.login);
  router.post('/refresh', controller.refresh);
  router.post('/logout', controller.logout);
  router.get('/me', authenticate, controller.me);

  return router;
}
