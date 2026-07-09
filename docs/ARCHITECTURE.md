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
