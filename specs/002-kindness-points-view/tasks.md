# Tasks: Kindness Points View

**Input**: Design documents from `/specs/002-kindness-points-view/`
**Prerequisites**: `plan.md` (required), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

## Execution Flow (main)
```
1. Confirm tech stack and libraries from `plan.md`.
2. Generate failing tests (contract + integration) according to contracts/ and quickstart.md.
3. Add unit tests for model/service behavior (TDD-first).
4. Implement models and services to make tests pass.
5. Implement API handling for `GET /posts?view=top` and session-only UI toggle.
6. Run full test suite and linting (flake8) until green.
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All file paths are absolute

## Phase 1: Setup
- T001 Initialize feature branch and ensure environment
  - Path: `/root/code/jeet/`
  - Description: Create branch `feature/002-kindness-points-view-setup` from `main`, install dev dependencies locally or prepare Docker environment for tests. Ensure `pytest`, `flake8`, and project requirements are available. Include exact commands to run: `git checkout -b 002-kindness-points-view`, `pip install -r requirements-dev.txt` or use `docker compose build`.
  - Dependency: none

- T002 [P] Configure linting and CI checks
  - Path: `/root/code/jeet/.flake8` and project root
  - Description: Ensure `flake8` is configured and runnable. Add/verify any project-specific flake8 ignores. Run `flake8 .` and fix obvious issues unrelated to this feature only if they block linting.
  - Dependency: T001

## Phase 2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE IMPLEMENTATION
- T003 [P] Create failing contract test for `GET /posts`
  - Path: `/root/code/jeet/specs/002-kindness-points-view/contracts/tests/test_contract_posts.py`
  - Description: Ensure the contract test exists and marks the contract for `GET /posts?view={latest,top}` as failing (it already asserts False). Leave as failing to satisfy TDD.
  - Dependency: T001

- T004 [P] Add integration tests for Quickstart scenarios (top vs latest)
  - Path: `/root/code/jeet/specs/002-kindness-points-view/quickstart.md` and tests under `/root/code/jeet/tests/integration/test_posts_top_view.py`
  - Description: Add an integration test that:
    1. Creates several posts (via DB or test client) with varying `created_at` and `kindness_points`.
    2. Calls `GET /posts` and asserts `latest` ordering (created_at desc).
    3. Calls `GET /posts?view=top` and asserts ordering by `kindness_points` desc, tie-breaker `created_at` desc, and that returned posts are within last 24 hours window.
  - Dependency: T001

- T005 [P] Add unit tests for `Post` model behavior and `top` window logic
  - Path: `/root/code/jeet/tests/unit/test_post_service.py`
  - Description: Unit tests for a new `post_service.top_posts(posts, window_hours=24)` function that:
    - Filters posts to last 24 hours
    - Orders by `kindness_points` desc, then `created_at` desc
    - Handles negative/zero kindness points
    - Returns stable ordering
  - Dependency: T001

## Phase 3: Core Implementation (ONLY after tests are failing)
- T006 Implement `Post.kindness_points` field in DB model [P]
  - Path: `/root/code/jeet/app/models.py` and migration under `/root/code/jeet/migrations/versions/`
  - Description: Add `kindness_points = Column(Integer, default=0, nullable=False)` to `Post` model. Create an Alembic migration script file naming convention `YYYYMMDD_add_kindness_points.py` in `/root/code/jeet/migrations/versions/` to add this column to the `post` table. Ensure default 0.
  - Dependency: T005

- T007 Implement `post_service.top_posts()` function
  - Path: `/root/code/jeet/app/utils.py` or create `/root/code/jeet/app/post_service.py`
  - Description: Implement function `top_posts(session, limit=50, window_hours=24)` or `top_posts(posts, window_hours=24)` that returns posts ordered by kindness_points desc, created_at desc, filtered to last 24 hours. Prefer creating a dedicated `app/post_service.py` and unit-testing it. Use SQLAlchemy query for DB-backed implementation.
  - Dependency: T005, T006

- T008 Expose `view` query param in API handler (backend)
  - Path: `/root/code/jeet/app/routes.py`
  - Description: Update existing `GET /posts` route to accept `view` query parameter (`latest`|`top`). Implement logic:
    - `latest`: existing behavior (order by created_at desc)
    - `top`: call `post_service.top_posts(...)` and return posts in JSON with `id`, `content`, `created_at`, `kindness_points` fields
  - Dependency: T007

- T009 [sequential] Add Alembic migration to set default values
  - Path: `/root/code/jeet/migrations/versions/` (new file)
  - Description: Ensure DB migration is present and migrations run in CI. Document command to run migrations in local quickstart.
  - Dependency: T006

## Phase 4: Integration
- T010 Connect service to DB queries and optimize
  - Path: `/root/code/jeet/app/post_service.py` and `/root/code/jeet/app/routes.py`
  - Description: Implement DB-backed `top_posts` using SQLAlchemy with proper time-window filtering (UTC-aware). Add indexing recommendation on `created_at` and `kindness_points` if needed.
  - Dependency: T008

- T011 Add request/response logging for feed endpoint
  - Path: `/root/code/jeet/app/routes.py` and `/root/code/jeet/app/__init__.py`
  - Description: Ensure requests to `/posts` are logged with `view` param, response count, and latency metrics. Keep logs privacy-preserving (no post content in logs unless debug)
  - Dependency: T008

- T012 Ensure moderation pipeline still applies
  - Path: `/root/code/jeet/app/utils.py` (moderation filter exists here)
  - Description: Validate that moderation/filtering is applied to posts returned in `top` view (no bypass). Add tests if necessary.
  - Dependency: T008

## Phase 5: Polish & Tests
- T013 [P] Unit tests for `post_service` edge cases
  - Path: `/root/code/jeet/tests/unit/test_post_service.py`
  - Description: Add tests for ties, negative points, posts outside window, empty lists.
  - Dependency: T007

- T014 [P] Integration tests for real-time updates (simulated)
  - Path: `/root/code/jeet/tests/integration/test_real_time_top_updates.py`
  - Description: Simulate kindness point updates and assert that subsequent `GET /posts?view=top` reflects new ordering (can be a simple sequential test calling update endpoint or direct DB mutation).
  - Dependency: T010

- T015 [P] Update docs and quickstart
  - Path: `/root/code/jeet/specs/002-kindness-points-view/quickstart.md` and `/root/code/jeet/README.md`
  - Description: Add example requests and expected outputs for both views, and document migration step for adding `kindness_points` column.
  - Dependency: T009

- T016 Run full test suite and fix flake8 issues
  - Path: repository root
  - Description: Run `pytest` and `flake8 .` until green. Fix only issues introduced by these changes.
  - Dependency: T013, T014

## Dependencies & Ordering Notes
- Setup (T001-T002) must run first.
- Tests (T003-T005) must be created and failing before implementation tasks (T006-T009).
- Model migration (T006, T009) must complete before services that query the new column (T007, T010).
- Implementation tasks touching the same files (e.g., `app/routes.py`) are sequential and should be coordinated.

## Parallel Execution Examples
- Example group A (can run in parallel since different files):
  - `Task Agent` run T003 (contract test already present)
  - `Task Agent` run T005 (unit test for service)
  - `Task Agent` run T002 (lint config)

  Commands:
  - `Task Agent: run tests/contract/test_contract_posts.py` (this asserts failing)
  - `Task Agent: create tests/unit/test_post_service.py` (write tests and run pytest -k post_service - expect failures)
  - `Task Agent: run flake8 .` (fix blocking issues)

- Example group B (sequential within same file):
  - `Task Agent` run T007 then T008 (implement service then update routes)

## Task IDs (summary)
- T001: Setup branch & env
- T002: Linting setup
- T003: Contract test for GET /posts (failing)
- T004: Integration tests for top vs latest (quickstart scenarios)
- T005: Unit tests for post_service.top_posts
- T006: DB model change: kindness_points
- T007: Implement post_service.top_posts
- T008: Update GET /posts route to support `view=top`
- T009: Alembic migration file
- T010: DB-backed service optimizations
- T011: Request/response logging
- T012: Ensure moderation applies
- T013: Unit tests for edge cases
- T014: Integration tests for real-time updates
- T015: Docs & quickstart update
- T016: Run full test suite and lint

## Validation Checklist
- [x] plan.md present
- [x] research.md present
- [x] data-model.md present
- [x] contracts/ present
- [x] quickstart.md present
- [ ] tasks.md created (this file)


---
Generated by task-template processor for feature: `Kindness Points View`.
