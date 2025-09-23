"""
app/__init__.py

Main Flask application factory and global objects for jeetSocial.
- Loads environment variables
- Initializes Flask, SQLAlchemy, Migrate, and optional rate limiting
- Registers routes and error handlers
"""

import os

try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None
from flask import Flask, jsonify, current_app, make_response
from flask_sqlalchemy import SQLAlchemy
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate
from werkzeug.exceptions import HTTPException

# Load environment variables if python-dotenv is available
if load_dotenv is not None:
    load_dotenv()

# Initialize extensions (actual init happens in create_app)
db = SQLAlchemy()
limiter = None


def create_app(config_override=None):
    """Create and configure the Flask application."""
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "default-secret-key")
    app.config["ENABLE_RATE_LIMITING"] = (
        os.getenv("ENABLE_RATE_LIMITING", "true").lower() == "true"
    )

    if config_override:
        app.config.update(config_override)

    # Initialize extensions
    db.init_app(app)
    Migrate(app, db)

    import logging

    logging.basicConfig(level=logging.INFO)
    logging.info(f"Rate limiting enabled: {app.config['ENABLE_RATE_LIMITING']}")

    # Configure rate limiter if enabled
    global limiter
    if app.config["ENABLE_RATE_LIMITING"]:
        limiter = Limiter(key_func=get_remote_address)
        limiter.init_app(app)
    else:
        limiter = None

    # Register blueprints/routes after extensions are initialized
    from app.routes import bp as routes_bp

    app.register_blueprint(routes_bp)

    # Global error handler for all unhandled exceptions
    @app.errorhandler(Exception)
    def handle_global_exception(e):
        # Determine status code (ensure it's an int). Default to 500.
        code = 500
        if isinstance(e, HTTPException) and getattr(e, "code", None) is not None:
            try:
                code = int(e.code)
            except (TypeError, ValueError):
                code = 500
        if hasattr(current_app, "logger"):
            current_app.logger.error(f"Unhandled exception: {e}")
        # Use make_response to create a Response with explicit status code
        resp = make_response(
            jsonify({"error": "Sorry, something went wrong. Please try again later."}),
            code,
        )
        return resp

    return app
