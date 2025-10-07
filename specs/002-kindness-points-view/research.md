# Research: Kindness Points View

## Summary
Decisions to support the feature "Kindness Points View" for jeetSocial: provide a session-only UI toggle between `latest` (default) and `top` views. "Top" is defined as posts ranked by `kindness_points` accumulated within the last 24 hours. No additional time-range selectors in this release.

## Resolved Unknowns
- Time window for Top view: last 24 hours (from spec clarifications).
- Persistence of user preference: session-only (resets on reload/new session).
- Negative/zero kindness points: included as-is and participate in ranking.
- Real-time updates: Top ordering must update live when kindness points change.

## Technical Decisions (Rationale)
- Project Type: Web application (backend Python Flask + frontend static assets) — aligns with repo structure (`app/`, `static/`).
- Language/Runtime: Python 3.10 (per Constitution and repo settings).
- Storage: PostgreSQL (project already uses migrations/alembic; `DATABASE_URL` env var present in .env examples).
- Testing: `pytest` for unit/integration; contract tests written as pytest tests that assert API contract and behavior. Flake8 for linting.
- Contracts: Single endpoint to expose feed: `GET /posts` with query parameter `view` (`latest` | `top`). This keeps surface minimal and reuses existing feed API.

## Alternatives Considered
- Adding separate endpoint `/posts/top` — rejected to keep API surface small and avoid duplication; query parameter is simpler and reversible.
- Persisting preference in localStorage or server-side — rejected by spec (session-only) and privacy goals.

## Next Steps (Phase 1 prerequisites)
- Generate data model and validation: add `kindness_points` attribute to Post entity documentation and clarify tie-breaker rule (most recent first).
- Produce OpenAPI contract for `GET /posts` with `view` query param and response schema including `id`, `content`, `created_at`, `kindness_points`.
- Create failing contract & integration tests that express requirements (TDD-first). These tests will be the red-line for implementation.


