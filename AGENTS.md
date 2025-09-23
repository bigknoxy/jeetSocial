# AGENTS.md

## jeetSocial Project Guidelines

- **Project Purpose:** jeetSocial is a minimal, anonymous social platform. All posts are anonymous and assigned a random username.
- **Naming:** Use `jeetSocial` for project-wide references. Posts should use random, non-identifiable usernames.
- **Privacy:** Do not collect or store any personal data. No tracking, no analytics.
- **Moderation:** All posts must pass a basic hate-speech filter (see `app/utils.py` for the word/phrase list). Extend the filter as needed.
- **Kindness Mission:** jeetSocial exists to spread and encourage kindness through anonymous sharing and support. All messaging, moderation, and user experience should promote positivity, support, and uplifting interactions.
- **UI/UX:** Homepage and feed are designed to encourage uplifting, supportive interactions. The About page and feedback link promote the kindness mission.

## Feature Flags & Environment Variables

| Variable              | Description                                 | Default/Example                        |
|----------------------|---------------------------------------------|----------------------------------------|
| DATABASE_URL         | Postgres connection URI                     | postgresql://postgres:...              |
| SECRET_KEY           | Flask secret key                            | your-secret-key                        |
| ENABLE_RATE_LIMITING | Enable rate limiting (1=on, 0=off)          | 1                                      |
| ENABLE_MODERATION    | Enable hate speech filter (1=on, 0=off)     | 1                                      |
| ...                  | See .env.example for all available flags    |                                        |

- See `.env.example` for all available flags and usage.
- **Do not commit secrets.**
- For onboarding and setup, see [README.md](./README.md).
- **Linux users:** You may need to install build dependencies before running `setup.sh` (see README for details).

## Database Maintenance Scripts

### Cleanup Long Posts Script

**File:** `cleanup_long_posts.py`

This script helps clean up existing posts that exceed the 280 character limit (introduced in a recent feature update). The character limit is enforced in both the frontend (UI input and live counter) and backend (API validation). It provides safe, reversible operations for database maintenance.

#### Usage

```bash
# Preview what will be changed (recommended first step)
python cleanup_long_posts.py

# Delete posts that exceed 280 characters
python cleanup_long_posts.py --delete

# Truncate posts to 280 characters (preserves posts but shortens them)
python cleanup_long_posts.py --truncate

# Skip confirmation prompts (use with caution!)
python cleanup_long_posts.py --truncate --force
```

#### Safety Features

- **Dry-run mode** (default): Shows exactly what will be changed without making modifications
- **Confirmation prompts**: Requires explicit user confirmation before making changes
- **Detailed logging**: Shows post IDs, usernames, and content previews
- **Database transactions**: Uses proper rollback on errors
- **Backup warnings**: Reminds users to backup their database

#### When to Use

- After deploying the character limit feature to clean up existing long posts
- During database maintenance or migration tasks
- When you need to ensure all posts comply with the new character limit

## UI/UX Note
- The homepage and feed include a live character counter for post input, which updates as you type and enforces the 280 character limit visually. Error messages for moderation, rate limiting, and character limit are shown clearly to users.

## Docker Usage

- The repository includes `docker-compose.yml` and a `wait-for-it.sh` utility used to ensure Postgres is ready before running migrations and starting the web server.

## Agentic Coding Guidelines

---

# 🚨 MANDATORY AGENTIC FEATURE WORKFLOW

EVERY TIME a new feature is added, follow the workflow in `.opencode/developer-flow.md` from start to finish. This covers ideation, branching, design, implementation (using the specialist developer agent where applicable), testing, linting, documentation, and PR submission.

Key expectations:
- Track sub-tasks in a todo list for feature work
- Run tests and linters during development
- Document public APIs and changes
- Never commit secrets or broken code

**Reference:** The full workflow is in `.opencode/developer-flow.md`.

1. **Think Big Picture:** Understand the project architecture before making changes.
2. **Code Quality:** Use clear, descriptive names and keep functions focused.
3. **Imports & Formatting:** Group imports logically and follow style guides (PEP8 for Python).
4. **Error Handling:** Handle errors gracefully and log context.
5. **Security:** Use environment variables for secrets; add `.env` to `.gitignore`.
6. **TDD:** Write tests alongside new code and prefer small unit tests.
7. **Build, Lint, Test:**
   - Document build/lint/test commands in README or here.
   - Prefer running single tests for fast feedback.
   - Run `flake8` on Python files before completing work and fix reported issues.
   - Use `docker compose build` to validate container changes locally when needed.
8. **Documentation:** Update docs for API or architectural changes.

## Build/Lint/Test Commands

- **Backend (Python/Flask):**
  - Run server: `python -m app`
  - Lint: `flake8 .`
  - Test all: `docker compose run web pytest`
  - Test single: `docker compose run web pytest tests/test_posts.py::test_create_post`
- **Frontend (JS/HTML):**
  - No build step; serve static files.
  - Lint: `eslint .` (if using JS)
- **End-to-End (E2E):**
  - See `e2e/` and `e2e/AGENTS.md` for the E2E test workflow.
- **CI/CD Testing:**
  - Test CI changes locally: `act`
  - Test specific workflow: `act -W .github/workflows/ci.yml`
  - Pass secrets: `act -s SECRET_KEY=value -s DATABASE_URL=...`

- **Security:** Store any secrets in `.env` (if needed). Never commit `.env` to version control.

---

## CI/CD & Specialist Agents

The project documents specialist agent roles (developer, ci/cd) and helper commands in `.opencode/` context files. Use these resources to automate repetitive tasks, but follow the workflow and review outputs before committing changes.

## Git Branching and Feature Development Workflow

- **Branching:** Create feature branches from `main` using `feature/<short-description>`.
- **Main Branch Stability:** Keep `main` deployable at all times.
- **Pull Requests:** Submit PRs with tests passing and documentation updated.
- **Review & Merge:** Merge after review and CI pass.

---
