import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { parse as parseYaml } from 'yaml';
import { createApiRouter, type ApiRoutesDeps } from './routes/index.js';
import { createErrorHandlerMiddleware } from './middleware/error-handler.middleware.js';
import { createGlobalRateLimiter } from './middleware/rate-limit.middleware.js';
import { createReadinessHandler } from './readiness.js';
import type { Logger } from '../../application/ports/logger.port.js';

export interface CreateAppOptions {
  corsOrigin: string;
  routesDeps: ApiRoutesDeps;
  logger: Logger;
  rateLimit: {
    windowMs: number;
    max: number;
  };
  // Liveness (`/health`) only checks the process is up; readiness
  // (`/health/ready`) checks these actual dependencies are reachable — an
  // orchestrator uses the two differently (restart vs. hold out of rotation).
  readiness: {
    prisma: PrismaClient;
    mlServiceUrl: string;
  };
}

// openapi.yaml lives at the package root; process.cwd() is always apps/api
// when this app runs (npm workspace scripts set cwd to the package dir),
// same assumption the --env-file relative paths in package.json rely on.
function loadOpenApiDocument(): unknown | null {
  try {
    const raw = readFileSync(path.resolve(process.cwd(), 'openapi.yaml'), 'utf-8');
    return parseYaml(raw);
  } catch {
    // Docs are a dev convenience, not a runtime dependency — missing the
    // file shouldn't take down the whole API.
    return null;
  }
}

export function createApp(options: CreateAppOptions): Express {
  const app = express();

  app.use(helmet());
  // `credentials: true` because the frontend sends the access token via
  // Authorization header today, but keeping cookies viable (e.g. future CSRF
  // work) means the CORS layer already has to allow them.
  app.use(cors({ origin: options.corsOrigin, credentials: true }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });
  app.get('/health/ready', createReadinessHandler(options.readiness));

  const openApiDocument = loadOpenApiDocument();
  if (openApiDocument) {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  }

  app.use(
    '/api/v1',
    createGlobalRateLimiter(options.rateLimit.windowMs, options.rateLimit.max),
    createApiRouter(options.routesDeps),
  );

  // Must be registered last: Express identifies error-handling middleware by
  // its four-parameter signature and only invokes it after `next(err)`.
  app.use(createErrorHandlerMiddleware(options.logger));

  return app;
}
