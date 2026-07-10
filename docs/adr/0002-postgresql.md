# ADR 0002: PostgreSQL as the primary datastore

## Status

Accepted

## Context

The app has two shapes of data at once: strictly relational, integrity-critical
records (users, organizations, membership/roles, RBAC) and semi-structured,
schema-varying records (uploaded dataset rows, ML feature vectors, model
metrics) where the columns aren't known ahead of time.

## Decision

A single PostgreSQL database for everything, using native `JSONB` columns
(`DatasetRow.data`, `MlFeatureSnapshot.featuresJson`, etc. — see ADR 0001's
domain layer) for the semi-structured side rather than a separate document
store (MongoDB) alongside it.

## Consequences

- One database to run, back up, and reason about transactions against —
  multi-tenant foreign keys (`Organization` → everything) stay enforced by
  the database itself, not application code.
- `JSONB` gives schema flexibility without a second datastore, at the cost
  of no column-level SQL constraints on the JSON content itself — acceptable
  for a validation/preview/cleaning workload (see `docs/ARCHITECTURE.md`'s
  Sprint 2 entry on `DatasetRow` for the full reasoning).
- Widely available on managed free tiers (Neon, Render, Railway, Supabase),
  which mattered for keeping this deployable without a dedicated DB server.
