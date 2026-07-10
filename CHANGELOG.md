# Changelog

This project doesn't (yet) use tagged GitHub releases — this file tracks
the same milestones by what shipped, grouped the way the sprints were run.

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
