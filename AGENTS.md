# AGENTS.md

## jeetSocial Project Guidelines

- **Project Purpose:** jeetSocial is a minimal, anonymous social platform. All posts are anonymous and assigned a random username.
- **Naming:** Use `jeetSocial` for project-wide references. Posts should use random, non-identifiable usernames.
- **Privacy:** Do not collect or store any personal data. No tracking, no analytics.
- **Moderation:** All posts must pass a basic hate speech filter. Extend the filter as needed.

## Feature Flags

- Use feature flags (environment variables or config settings) to toggle moderation, experimental features, or third-party integrations.
- Example: `USE_HATESONAR` enables ML-based hate speech detection; fallback to basic word list if disabled.

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
   - Build and test your changes and try to fix them if you get errors, you can use "docker compose build" to see if your changes were good or created an error

8. **Documentation:**  
   - Document public APIs, functions, and modules.  
   - Update docs with architectural changes.

## Build/Lint/Test Commands

- **Backend (Python/Flask):**
  - Run server: `python app.py`
  - Lint: `flake8 .`
  - Test all: `pytest`
  - Test single: `pytest tests/test_posts.py::test_create_post`
- **Frontend (JS/HTML):**
  - No build step; serve static files.
  - Lint: `eslint .` (if using JS)
  - Test: Add simple JS unit tests if needed.

- **Security:** Store any secrets in `.env` (if needed). Never commit `.env` to version control.
