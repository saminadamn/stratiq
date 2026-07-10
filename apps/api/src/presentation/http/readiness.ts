import type { PrismaClient } from '@prisma/client';
import type { Request, RequestHandler, Response } from 'express';

export interface ReadinessDeps {
  prisma: PrismaClient;
  mlServiceUrl: string;
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

// Readiness (unlike liveness) actually exercises the two things this API
// cannot function without — Postgres and the ML service it delegates
// predictions to — so an orchestrator can hold a container out of rotation
// during a dependency outage instead of routing traffic it can't serve.
export function createReadinessHandler(deps: ReadinessDeps): RequestHandler {
  return async (_req: Request, res: Response): Promise<void> => {
    const [database, mlService] = await Promise.all([
      checkDatabase(deps.prisma),
      checkMlService(deps.mlServiceUrl),
    ]);

    const ready = database && mlService;
    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not_ready',
      checks: { database, mlService },
    });
  };
}
