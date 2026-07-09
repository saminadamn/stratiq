import type { AnalyticsCache } from '../../application/ports/analytics-cache.port.js';

interface CacheEntry {
  value: unknown;
}

const DEFAULT_MAX_ENTRIES = 500;

// Bounded with simple FIFO eviction (Map preserves insertion order) rather
// than a TTL — correctness doesn't need expiry here (see cache-key.ts for
// why), only a cap so a long-running process doesn't accumulate unlimited
// distinct filter combinations.
export class InMemoryAnalyticsCache implements AnalyticsCache {
  private readonly store = new Map<string, CacheEntry>();

  constructor(private readonly maxEntries: number = DEFAULT_MAX_ENTRIES) {}

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    return entry ? (entry.value as T) : undefined;
  }

  set<T>(key: string, value: T): void {
    if (!this.store.has(key) && this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }
    this.store.set(key, { value });
  }
}
