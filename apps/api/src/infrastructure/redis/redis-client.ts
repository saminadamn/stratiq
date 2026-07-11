import { Redis } from 'ioredis';

// General-purpose client shared by the analytics cache, the rate-limit
// store, the readiness check, and the /metrics endpoint — one connection
// per process rather than one per feature.
export function createRedisClient(url: string): Redis {
  return new Redis(url);
}

// BullMQ requires its own connection settings (documented in its own
// troubleshooting guide): `maxRetriesPerRequest: null` so a blocking queue
// command never times out mid-retry, and `enableReadyCheck: false` because
// BullMQ manages readiness itself. Kept separate from createRedisClient so
// that constraint lives in exactly one place.
export function createBullMqConnection(url: string): Redis {
  return new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}
