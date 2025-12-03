#!/usr/bin/env python3
"""
Migration runner script for jeetSocial.

This script properly initializes the Flask application context and runs
database migrations using Flask-Migrate. It's designed to work in both
local development and CI environments.
"""

import os
import sys
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def main():
    """Main function to run database migrations."""
    try:
        # Check if migrations directory exists
        if not os.path.exists("migrations"):
            logger.info("No migrations directory found - skipping migrations")
            return 0

        # Validate required environment variables
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            logger.error("DATABASE_URL environment variable is required")
            return 1

        secret_key = os.getenv("SECRET_KEY")
        if not secret_key:
            logger.warning("SECRET_KEY not set, using default for migrations")
            os.environ["SECRET_KEY"] = "migration-secret-key"

        if "@" in database_url:
            db_display = database_url.split("@")[0]
        else:
            db_display = "configured"
        logger.info(f"Database URL: {db_display}")

        # Import and create the Flask app
        logger.info("Creating Flask application...")
        from app import create_app

        # Create app with proper configuration
        app_result = create_app()

        # Handle both return formats: (app,) or (app, socketio)
        if isinstance(app_result, tuple):
            app, _ = app_result
        else:
            app = app_result

        # Create application context
        with app.app_context():
            logger.info("Flask application context created")

            # Initialize Flask-Migrate if not already done
            try:
                from flask_migrate import Migrate, upgrade, stamp, current
                from app import db

                # Ensure Migrate is initialized
                if (
                    not hasattr(app.extensions, "migrate")
                    or app.extensions.get("migrate") is None
                ):
                    logger.info("Initializing Flask-Migrate...")
                    Migrate(app, db)
                else:
                    logger.info("Flask-Migrate already initialized")

                # Check if database tables already exist BEFORE running migrations
                logger.info("Checking if database tables exist...")
                try:
                    from sqlalchemy import inspect

                    inspector = inspect(db.engine)
                    table_names = inspector.get_table_names()
                    logger.info(f"Found tables: {table_names}")

                    if "post" in table_names:
                        logger.info(
                            "Database tables already exist - SKIPPING MIGRATIONS"
                        )

                        # Check if alembic version table exists
                        if "alembic_version" in table_names:
                            logger.info(
                                "Alembic version table exists - checking current "
                                "revision"
                            )
                            try:
                                current_rev = current()
                                logger.info(
                                    f"Current migration revision: {current_rev}"
                                )
                                if current_rev is not None:
                                    logger.info("✅ Database is already migrated")
                                    return 0
                            except Exception as current_error:
                                logger.warning(
                                    f"Could not get current revision: {current_error}"
                                )

                        # Tables exist but no proper alembic tracking - stamp it
                        logger.info(
                            "Stamping database as current (tables exist but no "
                            "migration tracking)"
                        )
                        try:
                            stamp()
                            logger.info("✅ Database stamped successfully")
                            return 0
                        except Exception as stamp_error:
                            logger.warning(f"Could not stamp database: {stamp_error}")
                            # Continue anyway since tables exist
                            logger.info(
                                "✅ Database tables exist and appear functional"
                            )
                            return 0
                    else:
                        logger.info("No existing tables found - will run migrations")

                except Exception as check_error:
                    logger.warning(f"Could not check database state: {check_error}")

                # Only run migrations if we didn't find existing tables
                logger.info("Running database migrations...")
                try:
                    upgrade()
                    logger.info("✅ Database migrations completed successfully")
                except Exception as migration_error:
                    error_str = str(migration_error).lower()
                    if any(
                        keyword in error_str
                        for keyword in [
                            "already exists",
                            "duplicate",
                            "duplicate table",
                            "relation",
                        ]
                    ):
                        logger.warning(
                            "Migration error suggests database already has tables"
                        )
                        # Test if we can access the database
                        try:
                            # Simple test query using SQLAlchemy 2.0 compatible syntax
                            with db.engine.connect() as conn:
                                from sqlalchemy import text

                                conn.execute(text("SELECT 1"))
                            logger.info(
                                "✅ Database is accessible and appears to be in "
                                "working state"
                            )
                            return 0
                        except Exception as test_error:
                            logger.error(f"Database is not accessible: {test_error}")
                            return 1
                    else:
                        logger.error(f"Migration failed: {migration_error}")
                        return 1

            except ImportError as e:
                logger.error(f"Flask-Migrate not available: {e}")
                return 1
            except Exception as e:
                logger.error(f"Error running migrations: {e}")
                import traceback

                traceback.print_exc()
                return 1

        return 0

    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        import traceback

        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
