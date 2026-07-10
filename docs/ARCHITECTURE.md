# Architecture decisions

This document records _why_, not _what_ — the code and inline comments cover the what.

## Monorepo: npm workspaces (not pnpm/Turborepo)

npm workspaces ship with Node itself, so no extra global tooling is required to build the
project. `pnpm`/`Turborepo` give faster installs and remote caching, which matter once the
repo has enough packages and CI minutes to justify them. For a two-app foundation, that
cost isn't paid back yet. The workspace boundaries (`apps/*`, `packages/*`) are the part
that's hard to change later; the tool that walks them is not — swapping to pnpm later is a
lockfile regeneration, not a restructure.

## `packages/shared` for cross-boundary types

The API and web app both need to agree on shapes: JWT payloads, role enums, request/response
DTOs. Duplicating them invites drift (e.g. web assumes a `role` string, api renames the enum).
A shared package makes the compiler catch that instead of a runtime bug in production.

## Backend: Clean Architecture layering

```
apps/api/src/
├── domain/            # Entities, value objects, repository interfaces. Zero framework deps.
├── application/        # Use cases (services) orchestrating domain logic. Depends on domain
│                        # interfaces only, never on Express or Prisma directly.
├── infrastructure/     # Prisma repository implementations, JWT/bcrypt adapters, config loading.
├── presentation/        # Express routes, controllers, middleware. Translates HTTP <-> use cases.
└── main.ts              # Composition root: wires infrastructure implementations into use cases.
```

Dependency direction always points inward (`presentation` → `application` → `domain`,
`infrastructure` → `domain` interfaces). This is what makes the domain/application layers
testable without a database and swappable (e.g. Prisma → another ORM) without touching
business rules. For a project whose stated goal is "production-grade," paying this structure
cost now is cheaper than retrofitting it once use cases have leaked into route handlers.

## RBAC as organization-scoped membership, not a global user role

A single global `role` field on `User` doesn't model reality for a B2B platform: the same
person can be an `OWNER` of one organization and a `VIEWER` invited into a client's. Modeling
`Membership(user, organization, role)` as its own entity is the only way to support that
without a breaking migration later. Every authorization check in this codebase therefore
takes `(userId, organizationId)` and resolves the role from `Membership`, never from `User`.

## JWT: short-lived access token + rotating refresh token, two secrets

- Access tokens are short-lived (15m default) and never persisted server-side — a stolen
  token self-expires quickly and revocation isn't needed for it specifically.
- Refresh tokens are longer-lived, so they're stored (hashed, not plaintext) in
  `RefreshToken` and rotated on every use: each refresh call issues a new refresh token and
  invalidates the old one. If a refresh token is replayed after rotation, that's a signal of
  theft, and the stored record lets the API revoke the whole chain.
- Access and refresh tokens are signed with **different secrets** so a leak of one signing
  key doesn't let an attacker forge the other token type.

## Signup creates a user _and_ an organization

There is no "organization-less" user in this model — a workspace is required to hold any
future data (dashboards, connections, etc.), and RBAC needs an organization to scope against
from the first request. The signup use case therefore creates the user, creates an
organization, and creates the initial `Membership` as `OWNER` in one transaction, so there's
never a partially-onboarded state to handle elsewhere in the codebase.

## Frontend: Vite, not Next.js

The brief calls for a dashboard SPA behind a separate Express API, not a framework that
wants to own routing/server rendering/API routes itself. Vite gives fast dev/build for a pure
client-side React app without fighting a meta-framework's opinions about where the backend
lives. This can be revisited if SSR/SEO becomes a requirement — it currently isn't, since this
is an authenticated internal dashboard.

## What's deliberately not built yet (Sprint 1)

Analytics, ETL/data ingestion, ML scoring, and dashboard widgets are out of scope for this
step by explicit instruction. Building them against an unreviewed auth/RBAC foundation risks
having to rework both layers together; landing the foundation first keeps the review surface
small.

# Sprint 2: Data Management & ETL Foundation

## Row storage: JSONB `DatasetRow`, not dynamic per-dataset tables

Users upload arbitrary CSV/Excel files with arbitrary columns. Two ways to store that in
Postgres: (a) `CREATE TABLE` dynamically per dataset/version, or (b) store each row as a JSONB
blob in one fixed `dataset_rows` table. This codebase uses (b). Dynamic DDL driven by
user-supplied column names is a SQL-injection-shaped risk surface and turns every upload into
a migration the app has to manage and eventually clean up; a fixed table with a JSONB `data`
column supports arbitrary schemas with zero DDL, while still being genuinely PostgreSQL (not a
side file) and queryable/paginatable with plain SQL. The tradeoff is no column-level SQL
constraints or indexes on the data itself — acceptable for a preview/validation/cleaning
workload, worth revisiting only if a future sprint needs to query dataset contents at scale.

## Versions are immutable snapshots; "current" is derived, not stored

`DatasetVersion` rows are never updated after creation — cleaning a dataset creates a new
version rather than mutating rows in place. There's no `Dataset.currentVersionId` pointer
either; "the latest version" is just the row with the highest `versionNumber` for that
dataset. Both choices exist for the same reason: a stored pointer would need updating (an
extra write, another thing that can drift) every time a version is added, and a circular
`Dataset ↔ DatasetVersion` foreign key is one more relationship to reason about for no benefit
over a `MAX(versionNumber)` query. This is also what makes "compare versions" and upload
history straightforward — every version is just sitting there, unmodified.

## The ETL pipeline runs synchronously, in the request

Upload → Validation → Cleaning → Transformation → Feature Engineering → Saving all happen
inside one HTTP request/response cycle (`EtlPipeline.run`, called from `UploadDatasetUseCase`
and `CleanDatasetUseCase`). There's no job queue or background worker in this sprint. The
`EtlJob`/`EtlLog` rows that back the "Processing Logs" UI are therefore written once, atomically,
after the whole pipeline has already succeeded in memory — not streamed stage-by-stage as they
happen. This means a mid-pipeline crash leaves no partial `EtlJob` row (nothing to resume
without a queue, so nothing worth persisting for a failed attempt), and the "live" processing
log is really "the completed log, rendered as a timeline." Introducing a queue (BullMQ, or
Postgres-backed) is the natural next step once uploads need to survive longer than one request
or run large enough files that synchronous processing blocks the event loop unacceptably.

## Feature engineering is heuristic, not schema-driven

There's no fixed schema uploaded datasets must match. `column-detection.ts` guesses which
column plays which business role (revenue, customer id, order id, order date, profit) from
naming patterns, and each metric in `metrics.ts` independently decides whether it has what it
needs and returns nothing otherwise. A wrong guess just means a metric is silently skipped,
never computed from the wrong column — the cost of this approach is that differently-named
but semantically-equivalent columns (e.g. "Sales" instead of "Revenue") may not be detected;
broadening `column-detection.ts`'s patterns is a low-risk, isolated change if that happens.

## Cleaning operations run in a fixed pipeline order, not caller order

`CleaningEngine` always applies operations in the same sequence — trim, standardize
categories, convert types, fill missing values, remove invalid records, remove duplicates —
regardless of what order the API caller lists them in. Order matters here: duplicates must be
removed _after_ trimming/standardizing (cleaning can make previously-distinct rows identical),
and missing-value fill should happen after type conversion (so a numeric mean is computed over
real numbers, not numeric-looking strings). AUTOMATIC mode runs every operation in this order;
MANUAL mode runs only the caller's requested subset, still in this order.

## Known accepted risk: dev-tooling-only npm audit findings

`npm audit` reports moderate/high/critical advisories against `vite`/`vitest`/`esbuild`'s
transitive dependency chain (the dev server accepting cross-origin requests it shouldn't, an
old `uuid` bounds-check issue via `exceljs`). These are all in build/test tooling, not runtime
application code, and the practical exposure is limited to someone with network access to a
locally-running dev server. Fixing them requires a major-version jump (Vite 5→8) that wasn't
verified against this codebase within this sprint's scope; tracked here rather than silently
ignored, to be addressed as a deliberate upgrade rather than folded into an unrelated change.

## Storage: local disk in dev, behind a port (`FileStorage`)

Uploaded files are written to `apps/api/storage/<organizationId>/<uuid>.<ext>` — never the
user-supplied filename, which is what rules out path traversal. `LocalFileStorage` implements
the same `FileStorage` port an S3/GCS-backed implementation would, so moving to object storage
in production is a new adapter class and a line in the composition root, not a rewrite of
upload/delete logic.

# Sprint 3 & 4: Analytics, Benchmarks, and the Intelligence Layer

## Dashboard data is derived on read, cached per dataset version

The four dashboards (Executive/Customer/Product/Inventory) never write their own tables —
every KPI, trend, and chart is computed from `DatasetRow` on request and cached in-process
keyed by `(organizationId, datasetVersionId, dashboardType)`. Because `DatasetVersion` rows
are immutable (Sprint 2), a cache entry never goes stale: the same version always produces
the same numbers, so there's no invalidation logic to get wrong, only a cache that's either
present or gets recomputed once.

## Insights/Alerts generate once per dataset version, not per request

`GenerateIntelligenceService` checks whether any `Insight` rows already exist for a dataset
version before computing anything; if they do, it returns them instead of recomputing. This
is the same "generate once, reuse forever" pattern the analytics cache uses, but persisted
(insights/alerts are shown across sessions, not just cached for one request's lifetime).

# v1.0: Predictive Intelligence, Decision Intelligence, Executive Reporting, Production

## Explainability: native feature importance, not SHAP

`RandomForestClassifier.feature_importances_` / `LogisticRegression.coef_` give a
deterministic, zero-extra-dependency explanation per prediction. SHAP adds real weight (its
own package, per-model-type explainer selection, slower per-request) for marginal benefit on
CSV-scale datasets — acceptable to revisit if a future model type needs it.

## The ML service is internal-only and never touches Postgres

`apps/ml-service` has no public port — only the Node API calls it, over the Docker-internal
network in production. It's also stateless with respect to the database: Node resolves the
dataset and derives all features itself (reusing the same `AnalyticsColumns`/aggregate
helpers every other analytics service uses), sends clean numeric vectors over HTTP, and
persists the result. Column detection and row-derivation logic is therefore never
reimplemented in Python — the ML service only ever sees numbers, never raw rows.

## Classical models, not deep learning

Logistic Regression / Random Forest (churn), linear-trend + seasonal-naive blend (forecast),
K-Means on RFM-style features (segmentation), popularity + content-similarity hybrid
(recommendations). All train in milliseconds on CSV-scale data and degrade gracefully — a
heuristic fallback, not a crash — on small samples, which a deep model would not.

## Models train on demand, per dataset version, and are cached

The first prediction request for a given `(organizationId, datasetVersionId, modelKey)`
trains and persists a versioned model artifact plus a registry row; later requests for the
same dataset version reuse it. The same "generate once per immutable dataset version"
pattern as Sprint 3/4's analytics cache and Insight/Alert generation, applied to ML models —
reused, not reinvented.

## The Decision Intelligence Engine is deterministic, in TypeScript, not an LLM

Every recommendation traces back to a concrete input (a root cause, an alert, a set of churn
predictions) through a fixed template, so the same inputs always produce the same output —
required for the engine to be explainable and testable with plain fixed-input/fixed-output
unit tests. It lives in `apps/api`, not the ML service, because it needs direct access to
`Insight`/`Alert`/`BenchmarkResult` rows already in Postgres via Prisma; it only crosses to
the ML service for `Prediction` inputs, through the same `MlServiceClient` port the rest of
the Node side uses.

## DB-level dedup guards instead of in-process locks

Sprint 4's `GenerateIntelligenceService`/`ensureDefaultBusinessRules` originally used an
in-process `Map` to serialize concurrent "check count, then insert if zero" races — correct
only for a single Node process. v1.0 introduces a stronger pattern instead: a real Postgres
unique constraint (partial, where relevant — e.g. `business_rules(organizationId, name) WHERE
isDefault`) plus `createMany({ skipDuplicates: true })`, so concurrent requests race harmlessly
at the database level with no coordination code needed at all. `ensureDefaultBusinessRules`
has been retrofitted to this pattern; `GenerateIntelligenceService`'s lock was left as-is,
since it's still correct for the current single-API-container deployment and retrofitting it
would touch two live tables' insert loops for limited benefit at this scale.

This retrofit exists because of a real bug this exact class of race caused: a root cause and
its corresponding recommendation could share similar title text (e.g. both about a revenue
decline), and without `category` in `DecisionRecommendation`'s unique key, `skipDuplicates`
silently dropped the second row as a false-positive duplicate of the first — found via live
browser testing, not by any automated test, since the specific dataset used in the automated
integration test didn't happen to produce a title collision. Fixed by widening the constraint
to `(organizationId, datasetVersionId, category, title)` and giving recommendations wording
distinct from their root cause.

## Reports use native PDFKit vector charts, not a headless browser

The existing `PdfKitReportGenerator` already drew tabular sections; v1.0 adds vector bar/line
chart primitives directly in PDFKit (rects and lines from the same DTOs the dashboards
render) instead of pulling in Puppeteer or a canvas library just to rasterize a chart image.

## Production stack: one nginx entrypoint, no orchestration platform

`docker-compose.prod.yml` publishes only nginx to the host; Postgres, the API, the web static
bundle, and the ML service all stay on the internal Docker network. This is deliberately not
Kubernetes/ECS/etc — the brief calls for "no unnecessary infra," and a single-host compose
stack with one reverse proxy is the smallest thing that actually satisfies "only one port is
publicly reachable" and "the ML service is internal-only" at once. Structured logging
(pino) and rate limiting (`express-rate-limit`, in-memory) follow the same reasoning: real
production hygiene without pulling in ELK or Redis for a workload that doesn't need them yet.

Three real configuration bugs surfaced only by actually bringing the full compose stack up
end-to-end, not by inspecting the Dockerfiles: a missing `.dockerignore` sent the entire
monorepo (`node_modules` included) as build context, which then failed outright on a Windows
npm-workspace symlink; the ML service's build context pointed at the repo root while its
`COPY` paths are relative to its own directory; and the API's production image pruned the
`prisma` CLI as a devDependency while still needing it to run `prisma migrate deploy` on
boot (fixed by moving `prisma` to `dependencies` and addressing it by absolute path, since
npm workspaces hoist it to the repo-root `node_modules`, not `apps/api/node_modules`). A
fourth, in nginx's routing rather than Docker: `/health` and `/health/ready` live at the
Express app root, not under `/api/v1`, so nginx's `/api/*`-only proxy rule was silently
routing health checks to the SPA instead of the API. All four are fixed and reverified live.

## Known accepted risk: dev-tooling-only npm audit findings (updated)

The advisory set is unchanged in kind from Sprint 2 — `npm audit` still only flags
`vite`/`vitest`/`esbuild`'s transitive dependency chain (dev/build tooling, not runtime
code). `apps/ml-service`'s pip dependencies are a separate ecosystem `npm audit` doesn't
cover; its `requirements.txt` (the prod image's runtime deps) deliberately excludes
`pytest`/`httpx`, which live in `requirements-dev.txt` instead, so the prod image doesn't
carry test tooling either way.
