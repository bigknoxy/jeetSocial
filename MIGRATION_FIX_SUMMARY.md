# Migration Fix for GitHub Actions CI

## Problem
The GitHub Actions CI workflow was failing at the migration step with the following error:
- `flask db upgrade` command was exiting with code 2
- Flask-Migrate couldn't properly access the Flask application context in the CI environment
- The Flask app factory pattern wasn't properly initialized for migrations

## Root Cause
The original CI workflow used:
```yaml
export FLASK_APP=app:create_app
flask db upgrade
```

This approach failed because:
1. Flask-Migrate needs the Flask application context to be properly initialized
2. The `migrations/env.py` file expects to access `current_app.extensions["migrate"]`
3. The app context wasn't properly established in the CI environment

## Solution
Created a robust migration runner script (`run_migrations.py`) that:

1. **Proper Flask App Context**: Creates the Flask application using the factory pattern and establishes proper app context
2. **Database State Detection**: Checks if database tables already exist before attempting migrations
3. **Smart Migration Logic**: 
   - If tables exist and alembic_version table exists: Checks current revision and skips if already migrated
   - If tables exist but no alembic tracking: Stamps database as current
   - If no tables exist: Runs full migrations from scratch
4. **Error Handling**: Gracefully handles edge cases like duplicate tables and connection issues
5. **CI Compatibility**: Works with the existing PostgreSQL service timing and environment variables

## Updated CI Workflow
Changed the migration step from:
```yaml
- name: Run migrations (if present)
  run: |
    if [ -d "migrations" ]; then
      pip install Flask-Migrate
      # Run migrations using Flask-Migrate under app context
      export FLASK_APP=app:create_app
      flask db upgrade
    fi
```

To:
```yaml
- name: Run migrations (if present)
  run: |
    if [ -d "migrations" ]; then
      pip install Flask-Migrate
      # Run migrations using our robust migration runner script
      python run_migrations.py
    fi
```

## Testing
The fix has been thoroughly tested with:

1. **Existing Database**: ✅ Correctly detects already-migrated database and skips migrations
2. **Fresh Database**: ✅ Successfully runs all migrations from scratch
3. **Partial State**: ✅ Handles databases with tables but no alembic tracking
4. **CI Environment**: ✅ Works with PostgreSQL service timing and environment variables
5. **Error Scenarios**: ✅ Gracefully handles connection issues and edge cases

## Files Modified
1. `run_migrations.py` - Enhanced with robust migration logic
2. `Dockerfile` - Added migration script to container
3. `.github/workflows/ci.yml` - Updated migration step to use new script

## Benefits
- ✅ Fixes CI migration failures
- ✅ Maintains compatibility with existing migration files
- ✅ Works with Flask app factory pattern
- ✅ Doesn't break local development
- ✅ Includes comprehensive error handling and debugging output
- ✅ Handles database service timing properly
- ✅ Gracefully handles all database states

This fix unblocks PR #19 and ensures reliable CI/CD pipeline execution.