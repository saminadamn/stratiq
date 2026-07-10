# ADR 0004: FastAPI for the ML service, kept separate from the Node API

## Status

Accepted

## Context

Predictive Intelligence (churn, forecasting, segmentation, recommendations)
needs scikit-learn, which means Python — but the rest of the platform is
TypeScript/Node. Two questions: which Python framework, and whether to
merge it into the existing API process at all.

## Decision

A separate service, `apps/ml-service`, on FastAPI. FastAPI specifically
because it gives Pydantic request/response validation (the same "validate
at the boundary" approach Zod already provides on the Node side) and
automatic OpenAPI docs with near-zero boilerplate — lighter than Flask
plus manual extensions, and far lighter than Django for a small internal
service with no ORM, templates, or admin panel of its own.

Kept as its own process rather than embedded via a subprocess or FFI
binding, and made internal-only (no public port) — see
`docs/ARCHITECTURE.md`'s "The ML service is internal-only and never
touches Postgres" entry for the full reasoning on that boundary.

## Consequences

- Two runtimes to deploy (Node + Python) instead of one — accepted directly
  by having `apps/ml-service` build/deploy independently (its own
  Dockerfile, its own `requirements.txt`/`requirements-dev.txt` split).
- The Node API and ML service can scale, restart, and fail independently;
  a crash in one doesn't take the whole platform down, only whatever
  depends on predictions at that moment.
- Column detection and business-rule logic is never duplicated in Python —
  Node resolves the dataset and sends only clean numeric feature vectors,
  so there's exactly one place "what counts as revenue" is decided.
