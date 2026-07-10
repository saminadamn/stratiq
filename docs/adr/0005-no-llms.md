# ADR 0005: No LLMs in the Decision Intelligence Engine

## Status

Accepted

## Context

The Decision Intelligence Engine turns KPIs, insights, benchmarks, and
predictions into root-cause explanations and recommendations — the kind of
output an LLM could plausibly generate as free text. It also needs to be
explainable, reproducible, and unit-testable with fixed inputs and outputs.

## Decision

Every recommendation is produced by a fixed, table-driven template in
TypeScript (`application/analytics/decision-intelligence/`), keyed off a
concrete input — a specific root cause, a specific triggered alert, a
specific churn-risk count — never by a model call. The same inputs always
produce the exact same recommendation text, ROI estimate, and action plan.

## Consequences

- Fully unit-testable with plain fixed-input/fixed-output assertions — no
  mocking an LLM API, no flakiness from non-deterministic generation.
- No LLM API cost, latency, or availability dependency on the request path.
- The tradeoff: recommendation _wording_ is limited to what's been
  explicitly templated (see `recommendation-engine.service.ts`) rather than
  free-form prose — adding a new recommendation category means writing a
  new template, not just better prompting.
- This is also why the root-cause/recommendation title-collision bug (see
  `docs/ARCHITECTURE.md`'s v1.0 entry on DB-level dedup guards) was fixable
  at all: with fixed templates, "these two rows have similar titles" is a
  deterministic, traceable condition to find and fix, not a matter of an
  LLM occasionally repeating itself.
