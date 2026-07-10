# ADR 0001: Clean Architecture layering for the backend

## Status

Accepted

## Context

The API needs to stay testable and swappable as it grows — business logic
(use cases) shouldn't be entangled with Express routing or Prisma query
calls, or every new feature risks becoming harder to test than the last.

## Decision

`apps/api/src` is split into four layers, dependencies pointing inward only:

```
domain/            Entities, value objects, repository interfaces. Zero framework deps.
application/       Use cases orchestrating domain logic. Depends on domain interfaces only.
infrastructure/    Prisma repository implementations, JWT/bcrypt, ML client, file storage.
presentation/      Express routes, controllers, middleware.
```

`presentation → application → domain`, and `infrastructure` only ever
_implements_ domain repository interfaces — it's never imported by
`application` directly. Wiring happens once, in `composition-root.ts`.

## Consequences

- Use cases are unit-testable with plain in-memory fakes for repository
  interfaces — no database needed to test business logic.
- Swapping Prisma for another ORM, or local disk storage for S3, is a new
  `infrastructure/` class plus one line in the composition root — the
  domain and application layers never change.
- The cost: more files and indirection than a typical "routes call Prisma
  directly" Express app. Worth it once "production-grade" and "testable
  without a database" are actual requirements, not just at scale.
