// Generic cache port — use cases depend on this interface, never on a
// concrete Map/Redis client, same Dependency Inversion pattern as
// FileStorage/TokenService. Async so a real network-backed implementation
// (Redis) can sit behind it — InMemoryAnalyticsCache resolves immediately.
export interface AnalyticsCache {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
}
