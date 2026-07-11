import type { NextFunction, Request, Response } from 'express';
import {
  httpRequestDuration,
  httpRequestsTotal,
} from '../../../infrastructure/observability/metrics.js';

// Route, not raw path: `req.route.path` is the Express pattern
// (`/organizations/:organizationId/reports`), never the interpolated URL —
// bounded label cardinality regardless of how many distinct organization
// IDs hit the API.
function routeLabel(req: Request): string {
  const routePath = req.route?.path as string | undefined;
  return `${req.baseUrl}${routePath ?? ''}` || req.path;
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    const labels = {
      method: req.method,
      route: routeLabel(req),
      status_code: String(res.statusCode),
    };
    httpRequestDuration.observe(labels, durationSeconds);
    httpRequestsTotal.inc(labels);
  });
  next();
}
