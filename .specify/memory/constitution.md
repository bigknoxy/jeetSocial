<!--
Sync Impact Report
- Version change: 2.1.1 → 2.1.2
- Modified principles:
  - [PRINCIPLE_1_NAME] → "Kindness & Privacy First"
  - [PRINCIPLE_2_NAME] → "Minimal Surface & Simplicity"
  - [PRINCIPLE_3_NAME] → "Test-Driven Development (TDD) — NON‑NEGOTIABLE"
  - [PRINCIPLE_4_NAME] → "Integration & Contract Testing"
  - [PRINCIPLE_5_NAME] → "Observability, Versioning & Release Discipline"
- Added / filled sections:
  - [SECTION_2_NAME] → "Additional Constraints & Runtime Requirements" (filled)
  - [SECTION_3_NAME] → "Development Workflow" (filled)
- Removed sections: none (template placeholders replaced)
- Templates requiring updates:
  - .specify/templates/plan-template.md — ⚠ pending: hard-coded "Constitution v2.1.1" line must be updated to v2.1.2
  - .specify/templates/spec-template.md — ✅ aligns, but verify "testable" language consistent with TDD requirement
  - .specify/templates/tasks-template.md — ✅ aligns (TDD emphasized already); confirm wording matches new TDD enforcement language
  - README.md — ⚠ pending: consider adding a short note referencing TDD as mandatory engineering practice
  - AGENTS.md — ⚠ pending: review and align agent directives (strong agentic instructions exist) with updated governance/TDD wording
  - .github/workflows/ci.yml — ⚠ pending: ensure CI enforces tests-first (fail-on-missing-tests-coverage / run flake8 early)
- Files requiring manual follow-up:
  - Set `RATIFICATION_DATE` (unknown) — TODO(RATIFICATION_DATE)
  - Update plan-template.md version string (2.1.1 → 2.1.2)
  - Run team review & ratify; after ratification set `RATIFICATION_DATE`
- Deferred placeholders intentionally left: none (all template tokens replaced). RATIFICATION_DATE is unknown and intentionally left as TODO.
-->

# jeetSocial Constitution

## Core Principles

### Kindness & Privacy First
jeetSocial MUST prioritize kindness, anonymity, and privacy in every design and implementation decision. All posts are anonymous and assigned non-identifying usernames; no personal data collection is permitted. Hate speech and harmful content MUST be blocked by the moderation filter in `app/utils.py` and enforced at both frontend and backend. Rationale: the project's mission is to create a safe, uplifting space — technical controls are mandatory to protect users and uphold that mission.

### Minimal Surface & Simplicity
The codebase and feature surface MUST be as small and simple as possible. Apply YAGNI and KISS: avoid features or abstractions created "for later". Every new file, dependency, or public API MUST have a clearly documented purpose. Rationale: small surface reduces attack vectors, maintenance cost, and cognitive load for contributors.

### Test-Driven Development (TDD) — NON‑NEGOTIABLE
TDD is mandatory. For every new feature, bugfix, or behavioral change:
- Write tests (unit, contract, or integration) that express the requirement or bug BEFORE writing implementation.
- Confirm the new tests FAIL (Red).
- Implement the minimal code to make tests PASS (Green).
- Refactor with tests to keep behavior intact (Refactor).
All tests and linters (including `flake8`) MUST pass locally before a PR is opened; CI MUST enforce the same checks. Rationale: TDD ensures correctness, prevents regressions, and documents expected behavior in executable form.

### Integration & Contract Testing
Integration and contract tests are required for all public APIs and for interactions between components (e.g., web frontend → backend API, DB contracts). Contracts MUST have explicit failing tests generated during design (contract-first mindset). Rationale: prevent accidental contract drift and ensure interoperability across components and deployment environments.

### Observability, Versioning & Release Discipline
- Observability: Structured logging, request/response logging, and basic metrics (errors, request rates, latency) MUST be present for backend components; logs should be human- and machine-friendly (JSON where appropriate).
- Versioning: The project follows semantic versioning for public artifacts and migration plans for breaking changes. Releases MUST include changelogs and migration notes.
- Release Discipline: Every release that affects runtime behavior or data models MUST include a documented rollout/migration plan and CI checks. Rationale: reliable operations, easier debugging, and predictable upgrades.

## Additional Constraints & Runtime Requirements

- Language & Platform: Python 3.10.x is the supported runtime for backend code. Docker and Docker Compose MUST be supported for local development and CI.
- Feature Flags: Feature flags are required for experimental moderation or rate-limiting changes.
- Security & Secrets: No secrets are stored in the repository. Environment variables (e.g., `DATABASE_URL`, `SECRET_KEY`) MUST be used for credentials. Do not commit `.env` files.
- Data Limits: Posts are limited to 280 characters. This constraint MUST be enforced at both client and server layers.
- Rate Limiting & Moderation: Rate limiting and the hate-speech filter MUST be configurable via environment flags. Moderation lists and normalization logic MUST be versioned and covered by tests.

## Development Workflow

- Branching:
  - Feature branches: `feature/<short-description>`
  - Hotfix branches: `hotfix/<short-description>`
  - Main branch: `main` remains deployable.
- Pull Requests:
  - PRs MUST include failing tests for new behaviors or explicit test additions for bugfixes.
  - PRs require at least two approvals from active maintainers and passing CI (tests + linters).
- Local Verification:
  - Developers MUST run `flake8 .` and the test suite locally before opening a PR.
  - Prefer lightweight local `pytest` runs for fast iteration; use Docker-based test runs to reproduce CI.
- Tasks & Plans:
  - Use `.specify/templates/plan-template.md`, `spec-template.md` and `tasks-template.md` as the canonical templates for planning.
  - The `Constitution Check` step in every plan MUST be completed and pass before implementation proceeds.
- Automation:
  - CI MUST run linters and tests on every PR; failing tests block merging.
  - Test-first automation: where possible, generate tasks that create failing tests before implementation tasks.

## Governance

- Supremacy: This Constitution sets mandatory engineering norms for jeetSocial and supersedes informal or ad-hoc practices.
- Amendment Procedure:
  1. Propose amendment via a PR that updates this constitution and includes a migration/implementation plan.
  2. The PR MUST include a rationale and compatibility analysis.
  3. Two maintainer approvals and passing CI (including tests and linting) are required to merge.
  4. For breaking governance changes (redefinitions/removals of existing mandatory principles), the PR MUST include a communication plan and a migration window.
- Versioning Policy:
  - MAJOR: Backward-incompatible governance or principle removals/redefinitions.
  - MINOR: Addition of a new principle or materially expanded guidance.
  - PATCH: Clarifications, wording fixes, or non‑semantic refinements (e.g., stronger wording that doesn't change the scope of enforcement).
  - When amending, update `CONSTITUTION_VERSION` following semantic rules and document version change in the Sync Impact Report in the file header.
- Compliance Review:
  - All plans (`/plan`) and generated tasks (`/tasks`) MUST include a constitution check. Failure to pass the check MUST be justified in the plan and approved by maintainers.
  - CI and PR reviews MUST validate compliance with the Constitution for policy-critical changes (privacy, moderation, data retention, TDD enforcement).
- Enforcement:
  - The CI pipeline SHOULD be configured to fail builds for missing or failing tests, flake8 violations, or changes that remove required moderation checks.
  - Maintain a compliance log for substantive governance changes for audit and accountability.

**Version**: 2.1.2 | **Ratified**: 2025-10-06 | **Last Amended**: 2025-10-06
