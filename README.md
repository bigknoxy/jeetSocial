# jeetSocial

[![Build Status](https://img.shields.io/github/workflow/status/your-org/jeetSocial/CI)](https://github.com/your-org/jeetSocial/actions)
[![Test Coverage](https://img.shields.io/codecov/c/github/your-org/jeetSocial)](https://codecov.io/gh/your-org/jeetSocial)
[![License](https://img.shields.io/github/license/your-org/jeetSocial)](LICENSE)

## Project Purpose & Kindness Mission
jeetSocial is a minimal, anonymous social platform designed to encourage kindness and privacy. All posts are anonymous and assigned random usernames. No personal data is collected, and all posts are filtered for hate speech using an extensive word/phrase list. The platform exists to spread and encourage kindness through anonymous sharing and support.

## Features
- Anonymous posting with random usernames
- Hate speech filter (see `app/utils.py`)
- No personal data collection or tracking
- Rate limiting to prevent spam
- Docker Compose for robust deployment
- Kindness-focused UI/UX
- Feature flags for moderation, rate limiting, and experimental features
- Automated database migrations
- Comprehensive test suite (unit, integration, E2E)

## Quickstart / Onboarding

### Requirements
- Python 3.11+
- Docker & Docker Compose (recommended)

### Setup (Local Development)
1. **Clone the repo:**
   ```bash
   git clone https://github.com/your-org/jeetSocial.git
   cd jeetSocial
   ```
2. **Create and activate a virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
4. **Copy and edit .env.example:**
   ```bash
   cp .env.example .env
   # Edit .env as needed
   ```
5. **Run the app:**
   ```bash
   python -m app
   ```

### Setup (Docker Compose)
```bash
docker compose up --build
```
- The web container waits for the Postgres database to be ready, runs migrations, and starts Flask.

## Project Structure
```
app/
  __init__.py
  models.py
  routes.py
  utils.py
  static/
    main.js
    index.html
    about.html
migrations/
  versions/
  ...
tests/
  ...
Dockerfile
docker-compose.yml
.env.example
AGENTS.md
README.md
```
- **app/**: Main Flask app and static frontend
- **migrations/**: Database migration scripts
- **tests/**: Unit, integration, and E2E tests
- **Dockerfile, docker-compose.yml**: Containerization and orchestration
- **AGENTS.md**: Project guidelines and coding standards

## API Documentation

### Endpoints
- `GET /api/posts`: Fetch posts (supports paging, `since` param)
- `POST /api/posts`: Create a new post (body: `{ message: "..." }`)
- `GET /feed`: Main feed page
- `GET /about`: About/mission page

#### Example: Fetch Posts
```bash
curl -X GET 'http://localhost:5000/api/posts?page=1&limit=20'
```
Response:
```json
{
  "posts": [
    { "id": 1, "username": "RandomUser", "timestamp": "2025-08-20T12:34:56Z", "message": "Hello world!" },
    ...
  ],
  "page": 1,
  "total_count": 42
}
```

#### Example: Create Post
```bash
curl -X POST 'http://localhost:5000/api/posts' -H 'Content-Type: application/json' -d '{"message": "Be kind!"}'
```
Response:
```json
{ "id": 43, "username": "RandomUser", "timestamp": "2025-08-20T12:35:00Z", "message": "Be kind!" }
```

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

## Build, Lint, Test Commands

### Backend (Python/Flask)
- Run server: `python -m app`
- Lint: `flake8 .`
- Test all: `docker compose run web pytest`
- Test single: `docker compose run web pytest tests/test_posts.py::test_create_post`

### Frontend (JS/HTML)
- Lint: `eslint .` (if using JS)
- Test: `npm test`, `npm run e2e`

### End-to-End (E2E)
- Run Playwright E2E tests: `npm run e2e`

## Contributing
- Use feature branches for new features (`feature/<short-description>`)
- Commit migration files with your changes
- Submit PRs to `main` after all tests pass
- See [AGENTS.md](./AGENTS.md) for project guidelines and coding standards

## License
This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

## Troubleshooting
- **Migration errors:**
  - Ensure the database is reachable (`db:5432`)
  - Migration files are present and committed
  - `.env` uses the correct Postgres URI
  - Use `docker compose logs web` and `docker compose logs db` for details
- **Endpoint issues:**
  - Ensure the app is running and migrations have completed
  - All routes (including `/feed`) are available once startup is complete
- **General:**
  - Confirm `.env` uses the correct Postgres URI and secrets

## About & Kindness Mission
- All posts are anonymous and must pass a hate speech filter
- The About page and UI promote positivity and kindness
- See `/static/about.html` for more on our mission

---

For full coding guidelines, feature flag details, and workflow, see [AGENTS.md](./AGENTS.md).
