# ADR 0003: Prisma as the ORM

## Status

Accepted

## Context

The repository-pattern domain layer (ADR 0001) needs *some* concrete
implementation behind its interfaces, and the team wanted compile-time
safety on queries rather than hand-written SQL strings scattered through
`infrastructure/persistence/*.repository.ts`.

## Decision

Prisma, generating a typed client from `schema.prisma`, used exclusively
inside `infrastructure/persistence/` — no other layer imports `@prisma/client`
directly, so a query's shape is guaranteed to match the schema at compile
time, and swapping ORMs later only touches that one directory.

## Consequences

- Migrations are generated and version-controlled (`prisma/migrations/`)
  instead of hand-written, and `prisma migrate deploy` runs automatically on
  every production boot (see the API's Docker `CMD` / Render start command).
- Raw SQL is still used where Prisma's query builder can't express something
  cleanly (partial unique indexes — see the `business_rules` migration and
  its schema comment) — the ORM isn't treated as sacred where it gets in the way.
- Cost: Prisma's client generation step is a real build dependency (`prisma
  generate` must run before `tsc`), which is exactly what broke the first
  cloud deploy attempt until it was added to the build command explicitly.
