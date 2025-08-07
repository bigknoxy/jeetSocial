# jeetSocial

Minimal, anonymous social platform. All posts are anonymous and assigned a random username.

## Quickstart

1. Copy `.env.example` to `.env` and adjust as needed.
2. Build and run with Docker Compose:
   ```
   docker-compose up --build
   ```
3. Access the app at [http://localhost:5000](http://localhost:5000)

## Environment Variables

The app uses environment variables for configuration. Here’s what each one means:

| Variable              | Purpose/Usage                                      | Effect on App                        |
|-----------------------|----------------------------------------------------|--------------------------------------|
| FLASK_APP             | Tells Flask which app to run                       | Starts jeetSocial backend            |
| FLASK_ENV             | Sets Flask environment mode                        | Enables debug features in dev        |
| DATABASE_URL          | Connection string for Postgres                     | Connects backend to database         |
| SECRET_KEY            | Security for sessions/cookies                      | Protects app, should be secret       |
| ENABLE_RATE_LIMITING  | Enables/disables rate limiting (default: true)     | Set to 'false' in dev to disable     |

**Details:**
- `FLASK_APP=app`: Tells Flask to run the app in the `app/` directory.
- `FLASK_ENV=development`: Enables debug features for development. Use `production` for live deployments.
- `DATABASE_URL=postgresql://postgres:postgres@db:5432/jeetsocial`: Connection string for the Postgres database (default for Docker Compose setup).
- `SECRET_KEY=your-secret-key`: Used for session management and security. Should be a long, random string in production.

## Feature Flags & .env

- All configuration is managed via environment variables in your `.env` file (see `.env.example`).
- The app uses [python-dotenv](https://pypi.org/project/python-dotenv/) to automatically load `.env` files.
- **ENABLE_RATE_LIMITING**: Set to `false` in your `.env` to disable rate limiting in development. Defaults to `true` in production.

## Rate Limiting

Normal users:
- Can post once per minute.
- If they try to post again too soon, they get a 429 error and must wait.
- The error message shown is:
  > "You are posting too quickly. Please wait a minute before posting again. This helps keep jeetSocial spam-free and fair for everyone."

Why?
- Prevents spam, flooding, and abuse.
- Keeps the platform fair and usable for everyone.

Rate limiting is enforced in production using Flask-Limiter. During automated tests, it is disabled to allow fast, reliable test runs. You can also disable it in development by setting `ENABLE_RATE_LIMITING=false` in your `.env`.

## Testing

Run tests inside the web container:
```
docker-compose run web pytest
```

### Test Coverage
- The project includes basic tests for posting messages and hate speech filtering.
- **During testing**, rate limiting is automatically disabled so tests can run without hitting '429 Too Many Requests' errors.
- This ensures robust, reliable test results and a smooth developer experience.

## Linting

Run flake8 inside the web container:
```
docker-compose run web flake8 .
```
