import type { NextFunction, Request, Response } from 'express';
import type { TokenService } from '../../../application/ports/token-service.port.js';

const BEARER_PREFIX = 'Bearer ';

// Factory (rather than a bare function importing a singleton) so the composition
// root controls which TokenService instance is used — no hidden global state,
// and tests can inject a fake TokenService without touching module internals.
export function createAuthenticateMiddleware(tokenService: TokenService) {
  return function authenticate(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers.authorization;
    if (!header || !header.startsWith(BEARER_PREFIX)) {
      res.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'Missing or malformed Authorization header.' },
      });
      return;
    }

    const token = header.slice(BEARER_PREFIX.length);
    const payload = tokenService.verifyAccessToken(token);
    if (!payload) {
      res.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'Access token is invalid or expired.' },
      });
      return;
    }

    req.userId = payload.sub;
    next();
  };
}
