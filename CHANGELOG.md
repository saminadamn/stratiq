# Changelog

This project doesn't (yet) use tagged GitHub releases — this file tracks
the same milestones by what shipped, grouped the way the sprints were run.

## Product polish — executive-grade redesign

- Public landing page at `/` (new hero, capability line, four-step feature
  grid); unauthenticated visitors no longer bounce straight to `/login`.
- Structured Decision Intelligence narrative fields (`finding`,
  `businessImpact`, `confidence`, `severity`, `changePercent`, `team`) on
  `DecisionRecommendation`, replacing raw rule-engine text across the
  dashboards, the Insights panel, and the Recommendation Report PDF — see
  `docs/ARCHITECTURE.md`'s "Executive-grade product redesign" section.
- Restyled charts, KPI cards, and recommendation cards; renamed the
  dashboard persona toggle's "Manager" view label to "Operations."
- Fixed a bug where legacy (pre-migration) recommendation rows were served
  forever instead of being regenerated with the new narrative fields, and
  a PDF footer bug that silently tripled some reports' page counts.

## v1.1 — Distributed Systems Showcase

- **Redis-backed caching**: `RedisAnalyticsCache` behind the existing
  `AnalyticsCache` port, selected automatically when `REDIS_URL` is set —
  falls back to the original in-memory cache otherwise (see
  `docs/adr/0006-redis-caching-and-rate-limiting.md`).
- **Redis-backed rate limiting**: `rate-limit-redis` fixes a real
  correctness gap — the previous in-memory limiter silently multiplied
  its effective limit across horizontally-scaled instances.
- **Async report generation via BullMQ**: `POST /reports/generate` now
  returns `202` with a `PENDING` report immediately; a worker (embedded
  in the API process by default, or a dedicated `worker` container via
  `WORKER_MODE=standalone`) processes the queue and updates the report to
  `COMPLETE`/`FAILED`. Falls back to an in-process queue with no Redis
  configured — the API contract is identical either way (see
  `docs/adr/0007-bullmq-job-queue.md`).
- **Observability**: request correlation IDs (`X-Request-Id` + pino child
  loggers), a Prometheus-format `GET /metrics` endpoint, and a `redis`
  field on `GET /health/ready` — deliberately without a Prometheus/Grafana
  stack (see `docs/adr/0008-observability.md`).
- Frontend: report status badges and polling on the Reports page.
- Every feature above is additive and optional — `REDIS_URL` unset keeps
  the app behaving exactly as it did in v1.0.

## v1.0 — Predictive & Decision Intelligence, Production Readiness

- **Predictive Intelligence**: Python/FastAPI ML microservice — churn
  prediction, sales forecasting, customer segmentation, product
  recommendations. Versioned model registry, feature store,
  per-prediction explainability.
- **Decision Intelligence**: deterministic root-cause analysis and
  prioritized, ROI-estimated recommendations with 30/60/90-day action
  plans — no LLM anywhere (see `docs/adr/0005-no-llms.md`).
- **Executive Reporting**: Executive Summary / KPI / Prediction /
  Recommendation PDF reports with embedded vector charts, download
  center, report history.
- **Production readiness**: multi-stage Docker builds, a single-entrypoint
  nginx reverse proxy, liveness/readiness health checks, structured
  (pino) logging, API rate limiting, environment validation that refuses
  placeholder secrets in production.
- **Engineering quality pass**: DB-level dedup guards replacing in-process
  locks, missing-index audit and fixes across the new ML tables, tenant
  isolation re-verification.
- Frontend visual redesign (teal brand accent, refined card/nav system).
- Cloud deployment support: `PORT` env var compatibility for PaaS hosts
  (Render/Railway/Heroku), `.python-version` pin for the ML service, a
  Vercel SPA routing fix.

## Sprint 4 — Analytics Intelligence Layer

- Metrics registry, trend detection, benchmark engine, configurable
  business rules, generated insights and alerts — all derived on read
  from existing dashboard data, generated once per immutable dataset
  version and cached.

## Sprint 3 — Business Intelligence & Analytics

- Executive, Customer, Product, and Inventory dashboards; a KPI engine;
  saved dashboard views; CSV/PDF/PNG export.

## Sprint 2 — Data Management & ETL

- CSV/Excel upload, validation, cleaning, and feature-engineering
  pipeline with immutable versioned dataset snapshots.

## Sprint 1 — Foundation

- Multi-tenant auth (JWT access + rotating refresh tokens), RBAC scoped
  to organization membership, Clean Architecture backend skeleton.
