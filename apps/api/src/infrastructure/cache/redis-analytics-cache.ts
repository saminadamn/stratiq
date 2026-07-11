import type { Redis } from 'ioredis';
import type { AnalyticsCache } from '../../application/ports/analytics-cache.port.js';

const KEY_PREFIX = 'analytics-cache:';

// Same correctness contract as InMemoryAnalyticsCache — keys embed an
// immutable datasetVersionId, so a cached value is never stale — but shared
// across every API instance instead of held in one process's memory. The
// TTL here is purely a memory-hygiene knob (bound how long an unused key
// lingers in Redis), not a correctness requirement, so it's an internal
// constructor default rather than a parameter on the AnalyticsCache port.
export class RedisAnalyticsCache implements AnalyticsCache {
  constructor(
    private readonly client: Redis,
    private readonly ttlSeconds: number,
  ) {}

  async get<T>(key: string): Promise<T | undefined> {
    const raw = await this.client.get(KEY_PREFIX + key);
    return raw === null ? undefined : (JSON.parse(raw) as T);
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.client.set(KEY_PREFIX + key, JSON.stringify(value), 'EX', this.ttlSeconds);
  }
}
