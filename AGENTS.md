# AGENTS.md

## jeetSocial Project Guidelines

- **Project Purpose:** jeetSocial is a minimal, anonymous social platform. All posts are anonymous and assigned a random username.
- **Naming:** Use `jeetSocial` for project-wide references. Posts should use random, non-identifiable usernames.
- **Privacy:** Do not collect or store any personal data. No tracking, no analytics.
- **Moderation:** All posts must pass a hate speech filter (see `app/utils.py` for the word/phrase list). Extend the filter as needed.
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
- **Linux users:** You may need to run the following command before running `setup.sh` to install required build dependencies for Python:
  ```bash
  sudo apt-get install -y make build-essential libssl-dev zlib1g-dev \
    libbz2-dev libreadline-dev libsqlite3-dev wget curl llvm \
    libncurses5-dev libncursesw5-dev xz-utils tk-dev libffi-dev \
    liblzma-dev git
  ```

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

#### Docker Usage

```bash
# Copy script to container (if running in Docker)
docker cp cleanup_long_posts.py jeet-web-1:/app/cleanup_long_posts.py

# Run from within the container
docker exec jeet-web-1 python cleanup_long_posts.py --dry-run
```

#### Important Notes

- **Always backup your database** before running with `--delete` or `--truncate`
- The script requires the Flask application to be properly configured
- Run with `--dry-run` first to see what will be affected
- The script will show detailed information about each post that will be modified

## Agentic Coding Guidelines

1. **Think Big Picture:**  
   - Understand the project architecture before making changes.  
   - Consider scalability, maintainability, and modularity.

2. **Code Quality:**  
   - Use clear, descriptive names for files, variables, functions, and classes.  
   - Prefer explicit types and interfaces where possible.  
   - Keep functions small and focused.

3. **Imports & Formatting:**  
   - Group imports logically (standard, third-party, local).  
   - Use consistent formatting (indentation, spacing, line length).  
   - Follow language-specific style guides (e.g., PEP8 for Python, Prettier/ESLint for JS/TS).

4. **Error Handling:**  
   - Handle errors gracefully and log them with context.  
   - Avoid silent failures; fail fast when necessary.

5. **Security:**  
   - Never store credentials, secrets, or API keys in code.  
   - Use environment variables or secret managers.  
   - Add `.env` to `.gitignore` and document required env vars.

6. **Test Driven Development (TDD):**  
   - Write tests before or alongside code for new features and bug fixes.  
   - Prefer small, focused unit tests.  
   - Use mocks/stubs for external dependencies.

7. **Build, Lint, Test:**  
    - Document build/lint/test commands in README or here.  
    - Prefer running single tests for fast feedback.
    - **All Python code must be verified with `flake8` before completion.** Run `flake8` on every file you write or modify, and fix all errors before marking a task complete or submitting code for review. The CI pipeline enforces this, so do not leave linting issues for CI to catch.
    - Build and test your changes and try to fix them if you get errors. Use `docker compose build` to verify your changes.


8. **Documentation:**  
   - Document public APIs, functions, and modules.  
   - Update docs with architectural or UI changes.

## Build/Lint/Test Commands

- **Backend (Python/Flask):**
  - Run server: `python -m app`
  - Lint: `flake8 .`
  - Test all: `docker compose run web pytest`
  - Test single: `docker compose run web pytest tests/test_posts.py::test_create_post`
- **Frontend (JS/HTML):**
  - No build step; serve static files.
  - Lint: `eslint .` (if using JS)
  - Test: Add simple JS unit tests if needed.
- **End-to-End (E2E):**
  - Run Playwright E2E tests: `npm run e2e`

- **Security:** Store any secrets in `.env` (if needed). Never commit `.env` to version control.

---

## Git Branching and Feature Development Workflow

- **Branching:**
  - For any new feature or significant update, create a new git branch from `main`.
  - Use the naming convention: `feature/<short-description>`. Example: `feature/updating-navigation`.
  - Do all work for the feature in this branch.

- **Main Branch Stability:**
  - The `main` branch must always remain fully functional and deployable.
  - Do not commit incomplete or experimental features directly to `main`.

- **Pull Requests (PRs):**
  - When feature work is complete, submit a pull request (PR) from your feature branch to `main` for review.
  - Ensure all tests pass and the feature is documented before submitting the PR.
  - The PR should include a summary of changes and any relevant context for reviewers.

- **Review and Merge:**
  - Feature branches are merged into `main` only after review and approval.
  - Resolve any conflicts and ensure the codebase remains stable after merging.

---
