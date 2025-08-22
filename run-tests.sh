#!/bin/bash
# run-tests.sh
# Robust Docker Compose test runner for Python projects

set -e

SERVICE="web"
PYTEST_ARGS="$@"

# Load .env variables for local runs (optional, safe for most dev/test cases)
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Check if the web service is running
if docker compose ps -q $SERVICE | grep -q .; then
  echo "🟢 $SERVICE is running. Using 'docker compose exec' for tests."
  docker compose exec $SERVICE pytest $PYTEST_ARGS
  TEST_EXIT_CODE=$?
else
  echo "🟡 $SERVICE is not running. Using 'docker compose run' for tests."
  docker compose run --rm $SERVICE pytest $PYTEST_ARGS
  TEST_EXIT_CODE=$?
fi

echo "🧹 Cleaning up orphan containers..."
docker compose down --remove-orphans

exit $TEST_EXIT_CODE
