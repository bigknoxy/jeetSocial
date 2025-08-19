# jeetSocial

## Overview
jeetSocial is a minimal, anonymous social platform designed for kindness and privacy. The app now uses Docker Compose for robust, production-grade deployment. The web container waits for the Postgres database to be ready using `wait-for-it.sh`, then runs migrations and starts Flask, ensuring reliable startup and schema consistency.

## Setup & Development

### Requirements
- Python 3.11+
- Docker & Docker Compose (for production and local development)

### Installation (Local Development)
1. **Create and activate a virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

### Database Migrations (Local)
- Migrations are managed with Flask-Migrate (Alembic).
- To initialize and generate migrations:
  ```bash
  flask db init                # Only once, if migrations/ does not exist
  flask db migrate -m "Describe your migration"
  flask db upgrade
  ```
- **Commit migration files:** Always commit new migration files in `migrations/versions/` to version control.

### Running Tests & Coverage

#### Python (Backend)
- Run all tests:
  ```bash
  PYTHONPATH=. ./venv/bin/pytest tests/
  ```
- Run tests with coverage:
  ```bash
  PYTHONPATH=. ./venv/bin/pytest --cov=app --cov-report=term-missing
  ```
- Minimum coverage threshold: **80%** (enforced in CI)

#### JavaScript (Frontend)
- Run all JS unit tests:
  ```bash
  npm test
  ```
- Run JS tests with coverage:
  ```bash
  npm run test:coverage
  ```
- Minimum coverage threshold: **80%** (enforced in CI)

#### End-to-End (E2E) Tests
- Run Playwright E2E tests:
  ```bash
  npm run e2e
  ```

### Expanding Test Coverage
- Add tests for edge cases (long/empty/special char posts, moderation bypass attempts).
- Add integration tests for API endpoints and error scenarios.
- Add E2E tests for critical user flows (posting, moderation, error handling).

### CI Integration
- All tests and coverage checks are run automatically in CI (see `.github/workflows/ci.yml`).
- Builds fail if coverage drops below threshold.

### Running the App

- **Development:**
  ```bash
  python -m app
  ```

- **Production & Local (Docker Compose):**
  ```bash
  docker compose up --build
  ```
  - The web container waits for the Postgres database to be ready using `wait-for-it.sh`.
  - Once ready, it runs migrations (`flask db upgrade`) and starts Flask.
  - All endpoints (including `/feed`) are available once the app is running.

### Environment Variables

- `.env` file is required. For Docker Compose and production, use a Postgres URI:
  ```
  DATABASE_URL=postgresql://postgres:postgres@db:5432/jeetsocial
  SECRET_KEY=your-secret-key
  ENABLE_RATE_LIMITING=1
  ```
- **Do not commit secrets.** Document required variables in README.

### Migration Workflow (Automated in Docker)

- Migration files are generated and committed to `migrations/versions/`.
- The Dockerfile copies migrations into the image.
- At container startup, migrations are applied automatically.
- The web service command in `docker-compose.yml`:
  ```
  command: /bin/sh -c "chmod +x wait-for-it.sh && ./wait-for-it.sh db:5432 -- flask db upgrade && flask run --host=0.0.0.0"
  ```
- **Race condition protection:** The app is robust against race conditions between web and db startup.

### Database Reset & Clean Migration

- To reset the database and apply migrations from scratch:
  ```bash
  docker compose down -v
  docker compose up --build
  ```
  This removes the database volume and ensures a clean migration.

## Kindness Mission
- All posts are anonymous and must pass a hate speech filter.
- The About page and UI promote positivity and kindness.

## Feature Flags
- Moderation and rate limiting can be toggled via environment variables.

## Docker Compose & Dockerfile Highlights
- **wait-for-it.sh** is copied into the image and used to block the web service until the database is ready.
- The web service runs:
  ```
  flask db upgrade && flask run --host=0.0.0.0
  ```
- The database volume is named `pgdata` and can be reset for clean migrations.

## Contributing
- Use feature branches for new features.
- Commit migration files with your changes.
- Submit PRs to `main` after all tests pass.
- See AGENTS.md for project guidelines.

## Troubleshooting
- **Migration errors:** If migrations fail, check:
  - The database is reachable (`db:5432`).
  - Migration files are present and committed.
  - The `.env` file uses the correct Postgres URI.
  - Use `docker compose logs web` and `docker compose logs db` for details.
- **Endpoint issues:** Ensure the app is running and migrations have completed. All routes (including `/feed`) are available once startup is complete.
- **General:** Confirm `.env` uses the correct Postgres URI and secrets.
