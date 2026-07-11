# ADR 0008: Observability without a monitoring stack

## Status

Accepted

## Context

Once report generation moved onto a queue (ADR 0007) and requests could be
served by any of several API instances or a separate worker process (ADR
0006), a single request or job's story could span multiple log streams
with no way to correlate them. The existing `Logger` port (`info`/`warn`/
`error`) had no concept of per-request context, and there was no way to
observe system behavior — request latency, error rates, queue depth —
without reading raw log lines by hand.

The obvious next step, a full Prometheus + Grafana stack, was explicitly
declined earlier in this project as too heavy for its scale — real
dashboards and alerting are operational overhead this project doesn't need
to demonstrate the underlying capability.

## Decision

Three pieces of real instrumentation, no dashboard stack:

1. **Correlation IDs.** `request-id.middleware.ts` reads an inbound
   `X-Request-Id` (trusting an upstream proxy in a multi-instance
   deployment) or generates one, attaches it to the response header, and
   sets `req.logger` to a child logger bound to it. The `Logger` port
   gained a `child(bindings)` method (implemented via pino's native
   `.child()`) specifically so this binding happens once per request
   instead of every individual `logger.error(...)` call having to thread
   `requestId` through by hand.
2. **A bare `/metrics` endpoint**, `prom-client`-based, in Prometheus text
   exposition format: default Node process metrics, an HTTP request
   duration histogram and counter (labeled by method/route/status —
   `route` is the Express pattern, never the raw path, so label
   cardinality stays bounded regardless of how many distinct organization
   IDs hit the API), and a queue-depth gauge sourced from BullMQ's
   `getJobCounts()` when Redis is configured. Left **unauthenticated** —
   this is a real, deliberate tradeoff (see Consequences), acceptable
   because the endpoint exposes only aggregate counts, never
   request/response bodies or business data.
3. **A `redis` field on `/health/ready`**, alongside the existing
   `database`/`mlService` checks — `true`/`false`/`'not_configured'`.
   Unlike the other two, readiness never fails solely because Redis isn't
   configured; every Redis-backed feature already has a working
   single-process fallback (ADR 0006, ADR 0007), so an unconfigured Redis
   isn't a degraded state worth taking the API out of rotation for.

## Consequences

- `/metrics` being unauthenticated means anyone who can reach the API can
  see aggregate request-rate and latency data. No business data, dataset
  contents, or per-user information is exposed — only counts and
  durations bucketed by route pattern. A `METRICS_TOKEN` header check
  would close this gap; not built now, to keep this addition scoped to
  "real instrumentation" rather than a second auth system.
- No dashboards, no alerting, no retention policy — `/metrics` is scraped
  by nothing today. It's infrastructure a real Prometheus could point at
  later, not a monitoring solution by itself.
- Every future log call that has access to `req` should use `req.logger`,
  not the top-level injected `logger`, to keep correlation IDs meaningful.
  The error handler (`error-handler.middleware.ts`) already does this and
  also returns the `requestId` in the 500 response body, so a user
  reporting an error can hand it to support without needing log access
  themselves.
