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
# SocketIO placeholder (initialized in create_app when available)
socketio = None


def create_app(config_override=None):
    """Create and configure the Flask application.

    Args:
        config_override (dict): Optional dict of configuration values to override.
    Returns:
        tuple: (Flask application instance, SocketIO instance)
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
    try:
        from flask_socketio import SocketIO
    except Exception:
        SocketIO = None
    from werkzeug.exceptions import HTTPException

    global db, limiter, socketio

    flask_app = Flask(__name__)
    # Apply base config from environment, then override with provided dict
    flask_app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
    flask_app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    flask_app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "default-secret-key")
    flask_app.config["ENABLE_RATE_LIMITING"] = (
        os.getenv("ENABLE_RATE_LIMITING", "true").lower() == "true"
    )
    if config_override:
        flask_app.config.update(config_override)

    # Ensure a single SQLAlchemy instance is used across the package
    if db is None:
        db = SQLAlchemy()
    db.init_app(flask_app)
    if Migrate is not None:
        Migrate(flask_app, db)

    # Configure optional rate limiter
    if (
        flask_app.config.get("ENABLE_RATE_LIMITING")
        and Limiter is not None
        and get_remote_address is not None
    ):
        limiter = Limiter(key_func=get_remote_address)
        limiter.init_app(flask_app)
    else:
        limiter = None

    # Configure SocketIO for WebSocket support
    if SocketIO is not None:
        # Try to use eventlet mode first, then fallback to threading
        async_mode = "threading"  # default fallback
        try:
            import eventlet

            async_mode = "eventlet"
            print("eventlet available, using async_mode=eventlet")
        except ImportError:
            try:
                import gevent

                async_mode = "gevent"
                print("gevent available, using async_mode=gevent")
            except ImportError:
                print(
                    "Neither eventlet nor gevent available, using async_mode=threading"
                )

        socketio = SocketIO(
            flask_app,
            cors_allowed_origins="*",
            async_mode=async_mode,
            logger=False,  # Reduce verbose logging
            engineio_logger=False,  # Reduce verbose logging
        )
        print(f"SocketIO initialized with async_mode={async_mode}")
    else:
        socketio = None
        print("SocketIO not available")

    # Register routes after extensions are initialized so route modules can
    # safely import models and the `db` instance.
    from app.routes import bp as routes_bp

    flask_app.register_blueprint(routes_bp)

    # Import websocket module to register event handlers
    if socketio is not None:
        try:
            from app import websocket

            print("WebSocket module imported successfully")
        except Exception as e:
            # If websocket module has issues, continue without it
            print(f"WebSocket module could not be imported: {e}")
            import traceback

            traceback.print_exc()

    # Global error handler for unhandled exceptions
    @flask_app.errorhandler(Exception)
    def handle_global_exception(e):
        code = 500
        if isinstance(e, HTTPException) and hasattr(e, "code") and e.code is not None:
            try:
                code = int(e.code) if e.code is not None else 500
            except (TypeError, ValueError):
                code = 500
        if hasattr(current_app, "logger"):
            current_app.logger.error(f"Unhandled exception: {e}")
        resp = make_response(
            jsonify({"error": "Sorry, something went wrong. Please try again later."}),
            code,
        )
        return resp

    # If socketio is None (disabled), return only the Flask app for gunicorn compatibility
    if socketio is None:
        return flask_app
    return flask_app, socketio
