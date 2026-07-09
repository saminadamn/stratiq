import { PrismaClient } from '@prisma/client';

// One PrismaClient per process (not per request) — it manages its own
// connection pool internally, so re-instantiating it per request would exhaust
// database connections under load.
export function createPrismaClient(): PrismaClient {
  return new PrismaClient();
}
