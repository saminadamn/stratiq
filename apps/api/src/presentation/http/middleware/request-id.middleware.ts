import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { Logger } from '../../../application/ports/logger.port.js';

// Trusts an upstream `X-Request-Id` (set by nginx/a load balancer in front
// of multiple API instances) so a request can be traced across process
// boundaries; generates one otherwise. Every downstream log call should use
// `req.logger` (a child logger bound to this ID) instead of the top-level
// logger, so a support conversation can grep one ID across every line a
// request touched — see error-handler.middleware.ts for where this matters
// most.
export function createRequestIdMiddleware(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const id = (req.headers['x-request-id'] as string | undefined) || randomUUID();
    req.id = id;
    req.logger = logger.child({ requestId: id });
    res.setHeader('X-Request-Id', id);
    next();
  };
}
