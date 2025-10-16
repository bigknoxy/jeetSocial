# Quickstart: Using the Kindness Points View

This quickstart shows how to exercise the new `view` parameter to fetch `latest` or `top` posts.

1. Start the backend and ensure the database is migrated and seeded with sample posts.
2. Request latest posts:

   GET /posts
   (defaults to `view=latest`)

3. Request top posts (default 24-hour window):

   GET /posts?view=top

4. Expected behavior:
- `latest`: posts ordered by `created_at` descending (most recent first)
- `top`: posts ordered by `kindness_points` desc, tie-broken by `created_at` desc. Window: last 24 hours.

5. Running tests locally:
- Run unit and integration tests: `pytest tests/`
- Lint: `flake8 .`

6. Using the UI Toggle:
- The homepage includes a "Latest" / "Top" toggle button next to "Recent Posts".
- Clicking the button switches between latest and top view.
- The URL updates with ?view=top for top view, and no param for latest.
- The feed refetches and reorders accordingly.
- Test the toggle with E2E tests: `npm run e2e`

