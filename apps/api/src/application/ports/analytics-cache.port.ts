// Generic cache port — use cases depend on this interface, never on a
// concrete Map/Redis client, same Dependency Inversion pattern as
// FileStorage/TokenService.
export interface AnalyticsCache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
}
