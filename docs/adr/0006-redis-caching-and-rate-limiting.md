# ADR 0006: Redis-backed analytics cache and rate limiting

## Status

Accepted

## Context

Two pieces of process state stop being correct the moment StratIQ runs on
more than one API instance. `InMemoryAnalyticsCache` is a plain `Map` —
each instance has its own copy, so two instances behind a load balancer can
answer the same dashboard request with different (equally valid, but
inconsistent) cached data. `express-rate-limit`'s default `MemoryStore` is
worse: it silently multiplies the effective limit by the number of
instances, since each one counts requests independently — a login
brute-force limit of 10 attempts per 15 minutes becomes 10 × N attempts
across N instances, with no error or warning.

## Decision

Both get a Redis-backed implementation behind their existing ports/APIs —
`RedisAnalyticsCache` implements the same `AnalyticsCache` interface as
`InMemoryAnalyticsCache`, and `rate-limit-redis`'s `RedisStore` slots
directly into `express-rate-limit`'s existing `store` option. Both are
selected in `composition-root.ts` by a single branch: `REDIS_URL` set →
Redis-backed, unset → today's single-process behavior. No separate feature
flags — one env var controls the whole distributed path (see ADR 0007 for
why the report queue follows the same branch).

The `AnalyticsCache` port itself stays TTL-less (`get`/`set`, two methods).
Cache keys already embed an immutable `datasetVersionId`
(`cache-key.ts`), so a cached value is never stale — correctness never
needed expiry, only memory bounding. `InMemoryAnalyticsCache` bounds itself
by entry count (FIFO eviction); `RedisAnalyticsCache` bounds itself with an
internal `EX` on every write (`REDIS_CACHE_TTL_SECONDS`, default 24h) —
purely a memory-hygiene knob, invisible to the port and to every call site.

The global and auth-specific rate limiters use distinct Redis key prefixes
(`rl:global:`, `rl:auth:`) so they don't share counters in the same
keyspace, exactly mirroring how they're two separate limiters today.

## Consequences

- `AnalyticsCache.get`/`set` had to become `async` (Redis is a network
  call) — a small, mechanical ripple through the 6 use cases that read from
  the cache, each gaining an `await`. `InMemoryAnalyticsCache` wraps its
  synchronous logic in `async` methods to satisfy the same port.
- The rate limiter fix is a real correctness improvement independent of
  the "showcase" framing — the in-memory store was already silently wrong
  for horizontal scaling before any of this work started.
- Local dev and a Redis-less deploy are unaffected: `REDIS_URL` unset means
  every request path behaves exactly as it did before this ADR.
- `bullmq`'s bundled `ioredis` dependency and this repo's own `ioredis`
  dependency need to resolve to the same version (pinned to `5.10.1` in
  `apps/api/package.json`) — otherwise TypeScript sees two structurally
  incompatible `Redis` types under `exactOptionalPropertyTypes`. Worth
  re-checking this pin if either dependency is upgraded.
