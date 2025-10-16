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

## Python Test & Filter Maintenance

- All Python tests must pass 100% before merging or deploying. Run with `docker compose run --rm --remove-orphans web pytest` after every backend change.
- The hate speech filter in `app/utils.py` must block all words/phrases listed in its filter set, including edge cases (punctuation, case, multi-word phrases). Update the filter list and normalization logic as needed to ensure all tests in `tests/test_filter.py` pass.
- After any filter logic change, rebuild the Docker image (`docker compose build`) before retesting.
- If a test fails, print debug output for normalization and matching, then iterate until all cases are blocked and all tests pass.
- Do not remove or skip failing tests—fix the logic or update the filter list until all tests pass.

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

---

# 🚨🚨🚨 MANDATORY AGENTIC FEATURE WORKFLOW 🚨🚨🚨

**EVERY TIME a new feature is added, you MUST follow the exact workflow in `.opencode/developer-flow.md` from start to finish.**

- **NO EXCEPTIONS.**
- **NO SHORTCUTS.**
- **NO UNTESTED CODE.**
- **NO UNDOCUMENTED CHANGES.**
- **NO UNTRACKED TODOs.**

If you do not follow this workflow, your code will be rejected and your PR will not be merged.

**The workflow covers:**

---

## Constitution Compliance (MANDATORY)
All agents (human or automated), including the specialist developer agent, MUST consult and obey the jeetSocial Constitution at `.specify/memory/constitution.md` (Version 2.1.2) before generating plans or implementing code. The Constitution enforces mandatory Test-Driven Development (TDD), branching and PR rules, and privacy/moderation norms.

- **Constitution Check in every plan:** Every plan generated by an agent MUST include a `Constitution Check` section that verifies the plan complies with the Constitution's mandatory principles. Plans that fail the check MUST document the deviation, provide a complexity justification, and require explicit maintainer approval.
- **Tests-first enforcement:** Agents that produce implementation tasks MUST create failing tests as part of the plan (tests that express the required behavior) before any implementation tasks are created.
- **Agent failure mode:** If the constitution check fails, agents MUST abort implementation and surface the failure with actionable remediation steps (e.g., 'add contract tests', 'reduce scope', 'add feature flag').
- **Governance changes:** Any agent proposing a change to the Constitution MUST create a PR that includes a rationale, compatibility analysis, migration plan, and MUST set `RATIFICATION_DATE` on merge (or include a documented justification in the PR body if ratification is deferred).

**Enforcement note:** CI will include an automated `constitution-check` step that blocks merges when the Constitution file contains unresolved placeholders (e.g., `TODO(RATIFICATION_DATE)`), or when required tests and linters are missing. See `.github/workflows/ci.yml` for implementation details.


- Ideation & scoping
- Branching & environment setup
- Design & planning
- Agentic implementation (using the specialist @developer sub agent)
- Testing (unit, integration, E2E - use @qa-testing-specialist sub agent)
- Linting & code quality
- Documentation (use @docs-maintainer sub agent)
- Final review
- Commit & PR
- Merge & cleanup

**You are REQUIRED to:**
- Use the specialist developer agent for all technical work
- Track every sub-task in a todo list
- Run all tests and linters after every change
- Document everything
- Never commit secrets or broken code
- Iterate until all tests and CI pass

**Reference:**
- The full workflow is in `.opencode/developer-flow.md` (read it and follow it for every feature)

---

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
  - **Robust E2E Test Workflow:**
    1. you MUST use the process in e2e/AGENTS.md for e2e testing!
    2. if you do use this process you are failing and lying to me.
- **CI/CD Testing:**
  - Test CI changes locally: `act`
  - Test specific workflow: `act -W .github/workflows/ci.yml`
  - Pass secrets: `act -s SECRET_KEY=value -s DATABASE_URL=...`
  - Iterate: Run `act`, review output, fix issues in workflow or code, repeat until passing.
  - Full usage guide: https://nektosact.com/usage/index.html

- **Security:** Store any secrets in `.env` (if needed). Never commit `.env` to version control.

---

## CI/CD Agent and Commands

## Specialist Developer Agent

The project includes a dedicated specialist developer agent defined in `.opencode/agent/developer.md`. This agent is designed to autonomously handle all technical development, testing, DevOps, and code maintenance tasks for jeetSocial, following the project's privacy, kindness, and quality guidelines.

**Delegation Guidelines:**
- The main agent should delegate all technical work (backend, frontend, database, testing, DevOps, documentation, security, etc.) to the specialist developer agent.
- For any task involving code changes, feature implementation, bug fixes, testing, CI/CD, or documentation, the specialist developer agent should be invoked.
- The specialist developer agent is fully aligned with the jeetSocial mission and tech stack, and is responsible for maintaining code quality, privacy, and positive user experience.

**Usage:**
- Refer to `.opencode/agent/developer.md` for the agent's detailed profile, responsibilities, and skill requirements.
- When a technical task is requested, the main agent should automatically delegate it to the specialist developer agent for execution.


### CI/CD Agent
The project includes a specialized CI/CD agent for GitHub workflows and DevOps automation:

**Usage:**
- `@cicd-agent analyze my workflow` - General CI/CD analysis
- `@cicd-agent help me optimize this pipeline` - Pipeline optimization
- `@cicd-agent what security tools should I add?` - Security recommendations

### CI/CD Commands
For common CI/CD tasks, use these dedicated commands:

- `/cicd-analyze` - Analyze current CI/CD setup and suggest improvements
- `/cicd-optimize` - Optimize GitHub Actions workflow for better performance
- `/cicd-security` - Add security scanning to CI/CD pipeline
- `/cicd-deploy` - Set up automated deployment workflow

**Example Usage:**
```bash
/cicd-analyze    # Analyze current pipeline
/cicd-optimize   # Get optimized workflow
/cicd-security   # Add security scanning
/cicd-deploy     # Set up deployment workflow
```

These commands automatically use the specialized CI/CD agent and provide structured, actionable outputs for specific DevOps tasks.

**Local Testing with Act:**

Before pushing CI/CD changes to GitHub, test them locally using `act` to catch issues early:

```bash
# Test default workflow
act

# Test specific workflow
act -W .github/workflows/ci.yml

# Pass environment variables
act -e .env.example
```

This ensures your workflow runs correctly before triggering GitHub Actions.

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

### Documentation & Search Comparison

**Use `webfetch` for:**
- Official documentation (Bun, React, Next.js, etc.)
- Direct URLs to specific docs pages
- Most reliable for authoritative information
- Latest feature documentation

**Use `exa_web_search` for:**
- Finding official documentation when you don't have the URL
- Searching for specific features/topics
- Getting multiple authoritative sources
- Latest releases and announcements

**Use `exa_get_code_context` for:**
- Real-world code examples and patterns
- Library/SDK usage from GitHub repos
- Community best practices
- Finding how others solve similar problems

**Priority Order:**
1. `webfetch` (if you have the exact URL)
2. `exa_web_search` (to find official docs)
3. `exa_get_code_context` (for code examples)

**Key Findings:**
- `exa_web_search` reliably finds official documentation
- `exa_get_code_context` often misses official docs, returns examples from other frameworks
- For documentation queries, `exa_web_search` > `exa_get_code_context