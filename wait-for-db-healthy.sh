#!/bin/sh
set -e

# Wait for the Postgres service to be ready using pg_isready
DB_HOST="db"
DB_USER="postgres"
MAX_ATTEMPTS=60
SLEEP_SECONDS=2

echo "Waiting for Postgres at $DB_HOST to be ready..."

# Determine which readiness check is available
if command -v pg_isready >/dev/null 2>&1; then
  READY_CMD="pg_isready -h \"$DB_HOST\" -U \"$DB_USER\""
  READY_CHECK_TYPE="pg_isready"
elif command -v psql >/dev/null 2>&1; then
  READY_CMD="psql -h \"$DB_HOST\" -U \"$DB_USER\" -c \"SELECT 1\;\""
  READY_CHECK_TYPE="psql"
else
  READY_CMD=""
  READY_CHECK_TYPE="none"
fi

for i in $(seq 1 $MAX_ATTEMPTS); do
  if [ "$READY_CHECK_TYPE" = "pg_isready" ]; then
    if pg_isready -h "$DB_HOST" -U "$DB_USER" >/dev/null 2>&1; then
      echo "Postgres is ready (pg_isready)"
      break
    fi
  elif [ "$READY_CHECK_TYPE" = "psql" ]; then
    if PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -c "SELECT 1;" >/dev/null 2>&1; then
      echo "Postgres is ready (psql)"
      break
    fi
  else
    # Fallback: try a simple TCP connection to port 5432
    if (echo > /dev/tcp/$DB_HOST/5432) >/dev/null 2>&1; then
      echo "Postgres TCP port is open on $DB_HOST:5432"
      break
    fi
  fi
  echo "Postgres not ready yet (attempt $i)"
  sleep $SLEEP_SECONDS
done

# Final verification
if [ "$READY_CHECK_TYPE" = "pg_isready" ]; then
  if ! pg_isready -h "$DB_HOST" -U "$DB_USER" >/dev/null 2>&1; then
    echo "ERROR: Postgres did not become ready after $((MAX_ATTEMPTS * SLEEP_SECONDS)) seconds."
    exit 1
  fi
elif [ "$READY_CHECK_TYPE" = "psql" ]; then
  if ! PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -c "SELECT 1;" >/dev/null 2>&1; then
    echo "ERROR: Postgres did not become ready after $((MAX_ATTEMPTS * SLEEP_SECONDS)) seconds."
    exit 1
  fi
else
  if ! (echo > /dev/tcp/$DB_HOST/5432) >/dev/null 2>&1; then
    echo "ERROR: Postgres did not become reachable on TCP after $((MAX_ATTEMPTS * SLEEP_SECONDS)) seconds."
    exit 1
  fi
fi

# Run migrations and start Flask
flask db upgrade
flask run --host=0.0.0.0
