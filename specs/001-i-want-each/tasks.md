# Tasks: Display Post Time In User Local Time

**Input**: Design documents from `/specs/001-i-want-each/` (spec.md present)
**Prerequisites**: `plan.md` (present); `research.md`, `data-model.md`, `contracts/` are not present — tasks generated from spec.md

## Execution Flow (main)

1. Setup repository for testing and linting.
2. Create failing tests (TDD) for contracts and integration scenarios derived from `spec.md`.
3. Implement data model (Post) and services to make tests pass.
4. Implement UI display helpers and API wiring if needed.
5. Run integration tests and polish documentation and accessibility.

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All file paths are absolute to the repository root

## Feature: Display Post Time In User Local Time

**Feature branch**: `001-i-want-each`

### Phase 1: Setup

- T001 Initialize virtual environment and install test/dev dependencies
  - Path: `/root/code/jeet/`
  - Command (developer running locally): `python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt`
  - Dependency notes: Ensure `pytest`, `freezegun` (for timezone tests), and `flake8` are available

- T002 [P] Ensure linting/formatting is configured (flake8)
  - Files to update/check: `/root/code/jeet/setup.cfg` or repo root flake8 config
  - Command: `flake8 .` (run after tests written)

### Phase 2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE IMPLEMENTATION

These tests must be written and must fail before any implementation changes.

- T003 [P] Contract test: GET /api/posts returns posts with canonical `creation_timestamp` and derived `display_timestamp` metadata
  - Test file: `/root/code/jeet/tests/contract/test_posts_get_contract.py`
  - Description: Call GET `/api/posts` (or the app's equivalent) and assert each post includes `creation_timestamp` (ISO 8601 UTC) and a `display_timestamp` object that will be derived for the viewer. Assert response schema shape (id, content, creation_timestamp, display_timestamp?) — test will fail until implementation.
  - Dependency: uses existing API route path; adapt to actual route if different (e.g., `/posts`)

- T004 [P] Contract test: GET /api/posts/{id} returns canonical timestamp and accessible absolute + relative representations
  - Test file: `/root/code/jeet/tests/contract/test_post_get_contract.py`
  - Description: Call GET `/api/posts/{id}` and assert response contains `creation_timestamp` (UTC) and that the endpoint provides metadata or fields that allow the frontend to compute `display_timestamp` (or server can return `display_timestamp` for a supplied timezone query param). Test must assert canonical timestamp preserved.

- T005 [P] Integration test: Viewer in UTC-07 sees localized display for a known post
  - Test file: `/root/code/jeet/tests/integration/test_display_timestamp_localization.py`
  - Description: Seed DB with a post having `creation_timestamp` `2025-10-06T12:00:00Z`. Simulate a client with timezone UTC-07:00 and assert UI/service returns a derived `display_timestamp` matching `2025-10-06 05:00 AM` (format may be flexible; test should assert proper offset and that canonical timestamp unchanged). Use `freezegun` or request header/param to simulate timezone.
  - Marked [P] — can run in parallel with other contract tests (different files)

- T006 Integration test: Relative vs absolute (hybrid rule)
  - Test file: `/root/code/jeet/tests/integration/test_display_timestamp_hybrid_rule.py`
  - Description: Create two posts: one 2 hours ago and one 48 hours ago (relative to server time). Assert that the 2-hour-old post is presented with a relative label (e.g., "2 hours ago") and the 48-hour-old post is presented with an absolute local short date + time (e.g., `Oct 5, 2025 05:00 AM`). Verify accessible absolute timestamp available in tooltip/metadata.

- T007 Integration test: Missing/invalid device timezone fallback to UTC
  - Test file: `/root/code/jeet/tests/integration/test_display_timestamp_fallback_utc.py`
  - Description: Simulate a client with no timezone info or invalid timezone header. Assert the presentation falls back to UTC and the UI indicates `UTC` label.

- T008 Integration test: Future timestamp (clock skew) shows `future` indicator
  - Test file: `/root/code/jeet/tests/integration/test_display_timestamp_future_indicator.py`
  - Description: Seed a post with canonical timestamp in the future relative to the simulated viewer clock. Assert the `future`/`clock skew` indicator appears alongside localized time and canonical UTC is available in metadata.

- T009 Accessibility test: Timestamps are accessible to screen readers
  - Test file: `/root/code/jeet/tests/integration/test_timestamp_accessible.py`
  - Description: Verify rendered timestamp elements include ARIA attributes or accessible descriptions conveying local time and canonical UTC where appropriate.

### Phase 3: Core Implementation (ONLY after tests are failing)

- T010 [P] Create Post model field verification and helper for `creation_timestamp`
  - File: `/root/code/jeet/app/models.py`
  - Description: Ensure `Post` entity has `creation_timestamp` stored as timezone-independent UTC (e.g., naive UTC or timezone-aware ISO). Add model-level validation tests (unit) in `tests/unit/test_models.py` — this task marked [P] (different file from service)

- T011 [P] Implement display timestamp helper in `app/utils.py`
  - File: `/root/code/jeet/app/utils.py`
  - Description: Add function `format_display_timestamp(creation_timestamp, viewer_timezone, now=None)` that returns an object including: `local_iso`, `local_formatted`, `relative_label` (if <24h), `is_future`, `canonical_utc`. Include unit tests in `tests/unit/test_utils_timestamp.py`.
  - Note: Keep logic minimal; tests define expected behavior.

- T012 Implement API support to surface canonical timestamps (if not already present)
  - Files: `/root/code/jeet/app/routes.py` and `/root/code/jeet/app/models.py`
  - Description: Ensure the GET posts endpoints include `creation_timestamp` in ISO 8601 UTC in responses. If current endpoints already return timestamps, add tests to assert format.

- T013 Add optional API query param `tz` for testing convenience (server may accept `?tz=America/Los_Angeles` to return server-computed `display_timestamp`) — AFTER tests and behind feature-flag if required
  - Files: `/root/code/jeet/app/routes.py`
  - Description: Implement optional `tz` param so integration tests can assert server-side computed `display_timestamp`. Document in quickstart.md if added.

### Phase 4: Integration

- T014 Connect display logic to feed rendering (frontend)
  - Files: `/root/code/jeet/static/main.js` and `/root/code/jeet/static/index.html` (or relevant frontend files under `/app/static/`)
  - Description: Use `creation_timestamp` + client timezone to display local times per hybrid rule. Add feature tests in `e2e/` if available.

- T015 Ensure DST ambiguity handled: tooltip shows canonical UTC + offset
  - Files: `/root/code/jeet/static/main.js`, `/root/code/jeet/static/index.html`
  - Description: On ambiguous local times (e.g., DST fall-back), include tooltip text with canonical time and offset.

### Phase 5: Polish [P]

- T016 [P] Unit tests for `format_display_timestamp` edge cases (DST, leap seconds, invalid tz)
  - File: `/root/code/jeet/tests/unit/test_utils_timestamp_edgecases.py`

- T017 [P] Performance/latency test for timestamp formatting at scale (batch formatting)
  - File: `/root/code/jeet/tests/perf/test_timestamp_format_perf.py`
  - Description: Ensure batch formatting of 1000 posts is within acceptable time (document threshold in quickstart.md)

- T018 [P] Update documentation: `specs/001-i-want-each/quickstart.md` and `README.md` brief
  - Files: `/root/code/jeet/specs/001-i-want-each/quickstart.md`, `/root/code/jeet/README.md`
  - Description: Add test instructions and feature notes (how to run tests, optional `tz` param, feature-flag info)

- T019 Accessibility verification and docs
  - Files: `/root/code/jeet/specs/001-i-want-each/quickstart.md`, `/root/code/jeet/README.md`
  - Description: Document screen reader expectations and how to assert accessibility in tests.

## Dependencies & Ordering Notes

- Setup (T001, T002) must run first.
- Tests (T003–T009) must be created and failing before Core Implementation (T010–T013).
- Models (T010) before Utils/Services that depend on them (T011, T012).
- API changes (T012, T013) only after tests and model/service pass.
- Frontend wiring (T014–T015) after backend surface points available.
- Polish tasks (T016–T019) can run in parallel where files differ and dependencies satisfied.

## Parallel Execution Examples

- Parallel group 1 (contract + integration tests): T003, T004, T005, T006, T007, T008, T009
  - Example Task agent commands (run concurrently):
    - `task run --file tests/contract/test_posts_get_contract.py`
    - `task run --file tests/contract/test_post_get_contract.py`
    - `task run --file tests/integration/test_display_timestamp_localization.py`

- Parallel group 2 (unit helpers & model creation after tests written): T010, T011 (different files)
  - Commands:
    - `task run --file app/models.py --type implement`
    - `task run --file app/utils.py --type implement`

## Generated by: /specify/templates/tasks-template.md

## Validation Checklist (GATE before execution)

- [ ] All tests (T003–T009) are present and fail prior to implementation
- [ ] All model tasks (T010) exist and have unit tests flagged
- [ ] Each task lists exact absolute file paths
- [ ] Parallel tasks do not write to the same file


---

End of tasks.md
