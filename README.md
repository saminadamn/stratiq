# StratIQ

[![CI](https://github.com/saminadamn/stratiq/actions/workflows/ci.yml/badge.svg)](https://github.com/saminadamn/stratiq/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-multi--stage-2496ED?logo=docker&logoColor=white)

A full-stack business intelligence platform: it takes a company's raw data (CSV uploads), turns it into dashboards and KPIs, runs machine learning models to predict things like customer churn and sales, and generates prioritized business recommendations — all packaged with the kind of production infrastructure (auth, caching, job queues, monitoring) a real company would actually run.

Live demo: **[stratiq-web.vercel.app](https://stratiq-web.vercel.app)**

I built this to practice designing a system the way a small SaaS company actually would — including the parts that don't show up in a tutorial, like tenant isolation, background job queues, and graceful degradation when Redis isn't configured.

---

## What it actually does

1. **Upload a dataset** (CSV) — it gets validated, cleaned, and versioned so nothing is silently overwritten.
2. **View dashboards** — Executive, Customer, Product, and Inventory views built from that data, with KPI tracking, trend detection, and configurable business rules that flag anomalies.
3. **See predictions** — a separate Python service trains models (scikit-learn) for churn risk, sales forecasting, customer segmentation, and product recommendations, and explains *why* each prediction was made.
4. **Get recommendations** — a rules-based engine (deliberately not an LLM — see [why below](#why-no-llms)) combines the KPIs, predictions, and business rules into prioritized action items with estimated ROI and a 30/60/90-day plan.
5. **Export a report** — Executive Summary, KPI, Prediction, or Recommendation reports as PDFs with real charts, not screenshots.

Everything is multi-tenant: each company's data is isolated by an `organizationId` on every table, enforced in the data-access layer rather than relying only on database-level row security.

---

## Tech stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React + TypeScript + Tailwind (Vite) | Fast dev loop, typed end-to-end |
| Backend API | Express + TypeScript, Clean Architecture | Business logic doesn't depend on Express or Prisma — it's testable in isolation |
| ML service | Python + FastAPI + scikit-learn | Kept as a separate internal service so a Python crash never takes down the main API |
| Database | PostgreSQL + Prisma | One database handles both relational data (users, roles) and semi-structured data (dataset rows, ML features via JSONB) |
| Auth | JWT (access + refresh), RBAC | Two separate signing keys, so a leaked access-token secret can't be used to forge refresh tokens |
| Caching / rate limiting | In-memory by default, Redis when configured | Works out of the box on one machine; scales to multiple instances without a code change |
| Job queue | BullMQ (Redis), in-process fallback | Report generation is the slowest request — queued so it doesn't block, but doesn't *require* Redis to work |
| Logging & metrics | pino (structured JSON) + Prometheus `/metrics` | Every log line is tagged with a request ID for tracing a single request through the system |
| Deployment | Docker Compose, multi-stage builds, nginx | Only nginx is exposed publicly; database, API, and ML service stay on the internal network |
| CI | GitHub Actions | Lint, typecheck, test, and build on every push |

**Full reasoning for each major decision is written up in [docs/ARCHITECTURE.md](https://github.com/saminadamn/stratiq/blob/main/docs/ARCHITECTURE.md) and as individual ADRs — see the table further down.**

---

## Project layout

```
StratIQ/
├── apps/
│   ├── api/          # Express API (Clean Architecture: routes → use cases → domain → persistence)
│   ├── web/           # React dashboard
│   └── ml-service/    # Python/FastAPI ML models — internal only, called by the API
├── packages/
│   └── shared/        # Types and DTOs shared between api and web
├── docker/            # Dockerfiles + dev/prod compose + nginx config
├── docs/              # Architecture write-up and ADRs
└── .github/workflows  # CI
```

---

## System design

<img src="https://private-user-images.githubusercontent.com/170039652/619973253-e23b0cff-d82d-4718-ba1d-c28886964569.png" alt="System architecture diagram" width="800">

**API internals:**

<img src="https://private-user-images.githubusercontent.com/170039652/619974281-12f392b0-c448-4f4e-b6df-6fd928775770.png" alt="API internals diagram" width="800">

**Data model** (every table except `User` carries an `organizationId` — that's the tenant-isolation boundary):

```
ORGANIZATION ||--o{ MEMBERSHIP : has
USER ||--o{ MEMBERSHIP : has
ORGANIZATION ||--o{ DATASET : owns
DATASET ||--o{ DATASET_VERSION : has
DATASET_VERSION ||--o{ DATASET_ROW : contains
DATASET_VERSION ||--o{ INSIGHT : "analyzed into"
DATASET_VERSION ||--o{ ML_MODEL : "trained on"
ML_MODEL ||--o{ PREDICTION : produces
ORGANIZATION ||--o{ ALERT : generates
ORGANIZATION ||--o{ BUSINESS_RULE : configures
ORGANIZATION ||--o{ DECISION_RECOMMENDATION : produces
ORGANIZATION ||--o{ REPORT : generates
```

---

## A few decisions worth explaining

Recruiters and engineers tend to ask about these, so here's the short version. Full write-ups are linked.

**[Clean Architecture, not a typical Express app](https://github.com/saminadamn/stratiq/blob/main/docs/adr/0001-clean-architecture.md)** — business logic lives in use-case classes that don't import Prisma or Express directly. This means the core logic can be unit-tested without spinning up a database, and the ORM could be swapped without touching business rules.

**[PostgreSQL for everything, including semi-structured data](https://github.com/saminadamn/stratiq/blob/main/docs/adr/0002-postgresql.md)** — rather than adding MongoDB for flexible data, dataset rows and ML features are stored as JSONB columns in Postgres. One database to run and back up, instead of two.

<a id="why-no-llms"></a>**[No LLMs in the recommendation engine, on purpose](https://github.com/saminadamn/stratiq/blob/main/docs/adr/0005-no-llms.md)** — the Decision Intelligence engine that generates business recommendations is fixed-template and deterministic. Same inputs always produce the same output, which makes it something you can actually unit test and trust in a demo — unlike an LLM call that might phrase things differently each run.

**[Redis is optional, not required](https://github.com/saminadamn/stratiq/blob/main/docs/adr/0006-redis-caching-and-rate-limiting.md)** — the app runs correctly on a single instance with in-memory caching and rate limiting. Redis is there to demonstrate what changes when you need to run more than one instance (shared cache state, a real job queue) — but nothing breaks if it's absent.

**[Background jobs for report generation](https://github.com/saminadamn/stratiq/blob/main/docs/adr/0007-bullmq-job-queue.md)** — PDF report generation is the slowest thing the API does, so it runs through a BullMQ queue when Redis is available, with an in-process fallback (`setImmediate`) when it isn't.

**[Observability without a monitoring stack](https://github.com/saminadamn/stratiq/blob/main/docs/adr/0008-observability.md)** — every request gets a correlation ID that's attached to every log line it produces and returned in error responses, plus a `/metrics` endpoint in Prometheus format. Deliberately stops short of running actual Grafana/Prometheus, since that's infrastructure, not application code.

---

## Running it locally

**Requirements:** Node.js 20+, Docker Desktop, and Python 3.12+ (only if you want to run the ML service outside Docker).

```bash
cp .env.example .env
npm install

# Start Postgres
docker compose -f docker/docker-compose.yml up -d db

# Set up the database
npm run prisma:generate
npm run prisma:migrate

# Run the ML service (separate terminal)
cd apps/ml-service
python -m venv .venv && .venv/Scripts/activate   # .venv/bin/activate on macOS/Linux
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000

# Run the API and frontend (separate terminals, from repo root)
npm run dev:api
npm run dev:web
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:4000` (Swagger docs at `/api/docs`)
- ML service: `http://localhost:8000`

**Redis is optional.** Everything above works with no Redis running at all. To try the Redis-backed path:

```bash
docker compose -f docker/docker-compose.yml up -d redis
# then add to .env: REDIS_URL=redis://localhost:6379
```

Or run everything (except the ML service) in containers:

```bash
docker compose -f docker/docker-compose.yml up --build
```

---

## Deploying to production

A separate Docker Compose file builds a production image for each service and puts them behind a single nginx reverse proxy. Only nginx is exposed to the outside world — Postgres, the API, the web server, and the ML service all stay on the internal Docker network.

```bash
cp .env.example .env   # replace the placeholder JWT secrets first — see below
docker compose -f docker/docker-compose.prod.yml up --build -d
```

The API runs pending Prisma migrations automatically on startup, so there's no separate migration step on deploy.

**Before deploying anywhere real**, generate proper JWT secrets — the app refuses to start in production with the placeholder values from `.env.example`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Health checks (both proxied through nginx): `GET /health` (is the process up) and `GET /health/ready` (are Postgres, the ML service, and Redis reachable — Redis only fails this check if it's configured but unreachable, since every Redis-backed feature has a working fallback).

**Running on a single free-tier host** (e.g. Render, with no separate worker product): set `REDIS_URL` to a managed Redis instance (Upstash's free tier works) and leave `WORKER_MODE` unset, so the one deployed process handles both HTTP requests and the report queue. The tradeoff is that a free host that spins down on idle can leave a report stuck mid-generation until the next request wakes it up — a paid host with a dedicated worker process (`WORKER_MODE=standalone`) avoids that.

---

## Environment variables

Full list with explanations in [.env.example](https://github.com/saminadamn/stratiq/blob/main/.env.example). The ones you're most likely to change:

| Variable | Default | What it does |
|---|---|---|
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | placeholders — must change in production | Token signing keys (two separate secrets) |
| `ML_SERVICE_URL` | `http://localhost:8000` | Where the API finds the ML service |
| `LOG_LEVEL` | `info` | Logging verbosity |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | `900000` / `300` | Global API rate limit (login/signup have their own stricter limit) |
| `HTTP_PORT` | `80` | Port nginx publishes in production |
| `REDIS_URL` | unset | Turns on Redis-backed caching, rate limiting, and job queue |
| `WORKER_MODE` | `embedded` | `embedded` runs the report worker inside the API process; `standalone` runs it as its own container |

---

## Security

What's actually built, not a checklist for show:

- **HTTP headers** — `helmet()` on every response
- **CORS** — explicit allowlist via `CORS_ORIGIN`, no wildcard
- **Passwords** — bcrypt-hashed
- **Tokens** — short-lived access tokens + rotating refresh tokens, signed with two different secrets so one leaking doesn't compromise the other
- **Authorization** — every permission check resolves `(user, organization) → role` from the membership table; there's no such thing as a global admin flag
- **Rate limiting** — a general limit across the API, plus a tighter one specifically on login/signup to slow down credential-stuffing attempts
- **Input validation** — every request is validated with Zod at the boundary; bad input returns a structured 400, not a stack trace
- **SQL injection** — not possible through normal use; every query goes through Prisma's parameterized query builder, no raw string-concatenated SQL anywhere
- **File uploads** — stored under a generated UUID, never the original filename (prevents path traversal)
- **Error responses** — the client gets a generic message; the real error and stack trace are logged server-side only
- **Boot-time checks** — the app won't start in production with placeholder JWT secrets still in place

**Deliberately not implemented:** CSRF protection. The API only accepts Bearer tokens, not cookies, which is the exact class of attack CSRF protection exists to stop — so it doesn't apply here rather than being an oversight.

---

## Observability

- **Correlation IDs** — every response includes an `X-Request-Id` header; every log line for that request carries the same ID, and it's included in any 500 error so a user can hand it to support without needing log access themselves.
- **`GET /metrics`** — Prometheus-formatted metrics: process stats, HTTP request duration/count by route, and job queue depth when Redis is on. No authentication required, and it only ever exposes counts — never request or response bodies.
- **`GET /health/ready`** — reports the status of the database, ML service, and Redis (`true` / `false` / `not_configured`).

Deliberately stops short of running Grafana/Prometheus — see [ADR 0008](https://github.com/saminadamn/stratiq/blob/main/docs/adr/0008-observability.md) for why.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev:api` / `dev:web` / `dev:worker` | Run one service in watch mode |
| `npm run build` | Build shared package → API → web, in that order |
| `npm run typecheck` | `tsc --noEmit` across all workspaces |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm run test` | Backend tests (Vitest). ML service tests run separately with `pytest` from `apps/ml-service` |
| `npm run prisma:migrate` / `prisma:migrate:deploy` / `prisma:seed` | Database migrations and seed data |

---

## What's built so far

- **Foundation** — multi-tenant auth (JWT + refresh tokens), role-based access control, Clean Architecture backend, a CSV upload pipeline with validation, cleaning, and versioned snapshots
- **Analytics** — four dashboards (Executive, Customer, Product, Inventory), a KPI engine, saved views, CSV/PDF/PNG export, trend detection, configurable business rules, generated insights and alerts
- **Predictive intelligence** — a Python ML service for churn prediction, sales forecasting, customer segmentation, and product recommendations, with a versioned model registry and per-prediction explanations
- **Decision intelligence** — a deterministic engine that turns KPIs, insights, and predictions into prioritized recommendations with ROI estimates and a 30/60/90-day action plan
- **Reporting** — Executive Summary, KPI, Prediction, and Recommendation reports as PDFs with real embedded charts
- **Production readiness** — multi-stage Docker builds, an nginx reverse proxy, liveness/readiness checks, structured logging, rate limiting, and startup checks that block insecure configs
- **Distributed systems path** — Redis-backed caching and rate limiting, an async report queue (BullMQ) with a working fallback when Redis isn't there, and the observability described above

Full changelog: [CHANGELOG.md](https://github.com/saminadamn/stratiq/blob/main/CHANGELOG.md)

---

## Testing

```bash
npm run test                     # 195+ backend unit + integration tests (Vitest, real Postgres)
cd apps/ml-service && pytest     # ML service unit + FastAPI integration tests
```

---

## Known limitations

`npm audit` flags some advisories in `vite`/`vitest`/`esbuild`'s dev-tooling dependencies. These don't affect the running application — only the build/test tooling — and are tracked rather than force-upgraded; details in [docs/ARCHITECTURE.md](https://github.com/saminadamn/stratiq/blob/main/docs/ARCHITECTURE.md#known-accepted-risk-dev-tooling-only-npm-audit-findings).
