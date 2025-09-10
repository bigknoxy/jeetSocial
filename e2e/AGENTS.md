- **End-to-End (E2E):**
  - **Robust E2E Test Workflow:**
    1. Check if jeetSocial web container is running (`docker ps`)
    2. If not running, start container (`docker compose up --build --remove-orphans`)
    3. Verify web app is running by inspecting docker logs (look for Flask startup and port 5000) - do this BEFORE you run e2e test
    4. Run Playwright E2E tests: `npm run e2e`
    5. Verify Results
    6. Shut down container after tests: `docker compose down` (unless you are running more test - then leave it up until last test is passing)
    7. Iteratively fix failing tests until all pass
        a. As part of this iterative process, remember you can run single test like this 'npx playwright test my.spec.ts'
        b. If you make app code changes you need to run 'docker compose up --build --remove-orphans' again for changes to be in effect
    8. Commit only when all tests pass and coverage is confirmed