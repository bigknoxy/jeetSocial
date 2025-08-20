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
