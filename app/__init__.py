"""
app/__init__.py

Flask application factory and shared extension instances for jeetSocial.
This module exposes a shared `db` object so modules may import `from app import db`.
create_app(config_override) returns a configured Flask app and calls `db.init_app(app)`
so the shared extension is registered with the Flask application instance.
"""

import os

try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None

# Load environment variables if python-dotenv is available
if load_dotenv is not None:
    load_dotenv()

# Create a shared SQLAlchemy instance if the library is available at import time.
# This ensures `from app import db` returns a usable SQLAlchemy object for models
# and tests. If Flask-SQLAlchemy is not installed in the environment, `db` will
# be None and will be created inside `create_app` when needed.
try:
    from flask_sqlalchemy import SQLAlchemy as _SQLAlchemy
except Exception:
    _SQLAlchemy = None

# Shared SQLAlchemy instance (may be None in very minimal environments)
db = _SQLAlchemy() if _SQLAlchemy is not None else None
# Rate limiter placeholder (initialized in create_app when available)
limiter = None


def create_app(config_override=None):
    """Create and configure the Flask application.

    Args:
        config_override (dict): Optional dict of configuration values to override.
    Returns:
        Flask application instance
    """
    # Lazy imports to allow light-weight imports of app package in unit tests
    from flask import Flask, jsonify, current_app, make_response
    from flask_sqlalchemy import SQLAlchemy

    try:
        from flask_limiter import Limiter
        from flask_limiter.util import get_remote_address
    except Exception:
        Limiter = None
        get_remote_address = None
    try:
        from flask_migrate import Migrate
    except Exception:
        Migrate = None
    from werkzeug.exceptions import HTTPException

    global db, limiter

    app = Flask(__name__)
    # Apply base config from environment, then override with provided dict
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "default-secret-key")
    app.config["ENABLE_RATE_LIMITING"] = (
        os.getenv("ENABLE_RATE_LIMITING", "true").lower() == "true"
    )
    if config_override:
        app.config.update(config_override)

    # Ensure a single SQLAlchemy instance is used across the package
    if db is None:
        db = SQLAlchemy()
    db.init_app(app)
    if Migrate is not None:
        Migrate(app, db)

    # Configure optional rate limiter
    if app.config.get("ENABLE_RATE_LIMITING") and Limiter is not None:
        limiter = Limiter(key_func=get_remote_address)
        limiter.init_app(app)
    else:
        limiter = None

    # Register routes after extensions are initialized so route modules can
    # safely import models and the `db` instance.
    from app.routes import bp as routes_bp

    app.register_blueprint(routes_bp)

    # Global error handler for unhandled exceptions
    @app.errorhandler(Exception)
    def handle_global_exception(e):
        code = 500
        if isinstance(e, HTTPException) and getattr(e, "code", None) is not None:
            try:
                code = int(e.code)
            except (TypeError, ValueError):
                code = 500
        if hasattr(current_app, "logger"):
            current_app.logger.error(f"Unhandled exception: {e}")
        resp = make_response(
            jsonify({"error": "Sorry, something went wrong. Please try again later."}),
            code,
        )
        return resp

    return app
