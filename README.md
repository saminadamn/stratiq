# StratIQ

Enterprise Business Intelligence & Decision Intelligence Platform.

> **Status:** foundation only. This step scaffolds the monorepo, tooling, auth, RBAC,
> and workspace (organization) model. No analytics, ETL, ML, or dashboard business logic
> is implemented yet — see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the reasoning
> behind each decision and what's intentionally deferred.

## Stack

| Layer    | Choice                                                |
| -------- | ----------------------------------------------------- |
| Frontend | React + TypeScript + Tailwind CSS (Vite)              |
| Backend  | Express + TypeScript (Clean Architecture)             |
| Database | PostgreSQL + Prisma ORM                               |
| Auth     | JWT (access + refresh) with role-based access control |
| Dev env  | Docker Compose                                        |
| CI       | GitHub Actions (lint, typecheck, build)               |

## Monorepo layout

```
StratIQ/
├── apps/
│   ├── api/          # Express API, Clean Architecture layers
│   └── web/          # React dashboard shell
├── packages/
│   └── shared/       # Types/DTOs shared between api and web
├── docker/           # Dockerfiles + compose for local dev
├── docs/             # Architecture Decision Records
└── .github/workflows # CI
```

## Prerequisites

- Node.js 20+
- Docker Desktop (for Postgres, and optionally the full stack)

## Getting started

```bash
cp .env.example .env
npm install

# Start Postgres (and optionally api/web) via Docker
docker compose -f docker/docker-compose.yml up -d db

# Generate the Prisma client and apply migrations
npm run prisma:generate
npm run prisma:migrate

# Run api and web in separate terminals
npm run dev:api
npm run dev:web
```

Web runs at `http://localhost:5173`, API at `http://localhost:4000`.

To run the entire stack (db + api + web) in containers instead:

```bash
docker compose -f docker/docker-compose.yml up --build
```

## Scripts (root)

- `npm run dev:api` / `npm run dev:web` — run a single app in watch mode
- `npm run build` — build shared package, then api, then web (dependency order)
- `npm run typecheck` — `tsc --noEmit` across all workspaces
- `npm run lint` / `npm run format` — ESLint / Prettier across the repo
- `npm run prisma:migrate` / `npm run prisma:seed` — database migrations & seed data

## What's implemented in this step

- Monorepo (npm workspaces) with strict, shared TypeScript config
- ESLint (flat config) + Prettier, wired into CI
- Dockerized Postgres + dev containers for api/web
- Prisma schema: `User`, `Organization`, `Membership` (role), `RefreshToken`
- JWT auth: signup, login, refresh (rotation), logout, `me`
- RBAC middleware scoped to organization membership (`OWNER`/`ADMIN`/`MEMBER`/`VIEWER`)
- Organization ("workspace") model — a user can belong to multiple organizations
- A protected dashboard shell (sidebar/topbar, empty content area) proving the
  auth flow end-to-end

## What's explicitly out of scope for this step

Analytics, ETL/data ingestion, ML/scoring, and real dashboard widgets. These land
once the foundation above is reviewed and accepted.
