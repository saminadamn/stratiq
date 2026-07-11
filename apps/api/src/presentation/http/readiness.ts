import type { PrismaClient } from '@prisma/client';
import type { Request, RequestHandler, Response } from 'express';
import type { Redis } from 'ioredis';

export interface ReadinessDeps {
  prisma: PrismaClient;
  mlServiceUrl: string;
  // v1.1 (Distributed Systems Showcase). Null when REDIS_URL isn't set —
  // readiness never fails solely because Redis isn't configured, since
  // every Redis-backed feature has a working single-process fallback.
  redisClient: Redis | null;
}

// A short timeout so a hung ML service makes this endpoint report "not
// ready" quickly instead of hanging the orchestrator's own health check.
const ML_SERVICE_TIMEOUT_MS = 2000;

async function checkDatabase(prisma: PrismaClient): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

async function checkMlService(mlServiceUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${mlServiceUrl}/health`, {
      signal: AbortSignal.timeout(ML_SERVICE_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function checkRedis(redisClient: Redis | null): Promise<boolean | 'not_configured'> {
  if (!redisClient) {
    return 'not_configured';
  }
  try {
    await redisClient.ping();
    return true;
  } catch {
    return false;
  }
}

// Readiness (unlike liveness) actually exercises the things this API
// depends on — Postgres and the ML service it delegates predictions to are
// hard requirements; Redis is a soft one (see checkRedis) — so an
// orchestrator can hold a container out of rotation during a dependency
// outage instead of routing traffic it can't serve.
export function createReadinessHandler(deps: ReadinessDeps): RequestHandler {
  return async (_req: Request, res: Response): Promise<void> => {
    const [database, mlService, redis] = await Promise.all([
      checkDatabase(deps.prisma),
      checkMlService(deps.mlServiceUrl),
      checkRedis(deps.redisClient),
    ]);

    const ready = database && mlService && redis !== false;
    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not_ready',
      checks: { database, mlService, redis },
    });
  };
}
