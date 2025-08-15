#!/bin/sh
set -e

# Wait for the Postgres service to be ready using pg_isready
DB_HOST="db"
DB_USER="postgres"
MAX_ATTEMPTS=60
SLEEP_SECONDS=2

echo "Waiting for Postgres at $DB_HOST to be ready..."

for i in $(seq 1 $MAX_ATTEMPTS); do
  if pg_isready -h "$DB_HOST" -U "$DB_USER"; then
    echo "Postgres is ready!"
    break
  fi
  echo "Postgres not ready yet (attempt $i)"
  sleep $SLEEP_SECONDS
done

if ! pg_isready -h "$DB_HOST" -U "$DB_USER"; then
  echo "ERROR: Postgres did not become ready after $((MAX_ATTEMPTS * SLEEP_SECONDS)) seconds."
  exit 1
fi

# Run migrations and start Flask
flask db upgrade
flask run --host=0.0.0.0
