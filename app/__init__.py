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

            # Reference eventlet to avoid unused import warning
            _ = eventlet.__version__
            async_mode = "eventlet"
            print("eventlet available, using async_mode=eventlet")
        except ImportError:
            try:
                import gevent

                # Reference gevent to avoid unused import warning
                _ = gevent.__version__
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

            # Reference websocket module to avoid unused import warning
            _ = websocket.__doc__
            print("WebSocket module imported successfully")
        except Exception as e:
            # If websocket module has issues, continue without it
            print(f"WebSocket module could not be imported: {e}")
            import traceback

            traceback.print_exc()

    # Intelligent 404 error handler to distinguish expected vs problematic 404s
    @flask_app.errorhandler(404)
    def handle_404(e):
        """Handle 404 errors with appropriate logging levels based on request context."""
        from flask import request

        request_path = getattr(request, "path", "unknown")

        # Define expected 404s that should only log at DEBUG level
        expected_404s = [
            "/favicon.ico",
            "/robots.txt",
            "/security.txt",
            "/apple-touch-icon.png",
            "/apple-touch-icon-precomposed.png",
            "/browserconfig.xml",
            "/manifest.json",
            "/sitemap.xml",
        ]

        # Define API endpoints that should log at WARNING level (potential issues)
        api_patterns = ["/api/", "/socket.io/"]

        # Determine logging level and message
        if request_path in expected_404s:
            log_level = "debug"
            message = f"Expected 404 for standard file: {request_path}"
        elif any(pattern in request_path for pattern in api_patterns):
            log_level = "warning"
            message = f"API endpoint 404 (potential issue): {request_path}"
        else:
            log_level = "info"
            message = f"404 Not Found: {request_path}"

        # Log at appropriate level
        if hasattr(current_app, "logger"):
            if log_level == "debug":
                current_app.logger.debug(message)
            elif log_level == "warning":
                current_app.logger.warning(message)
            else:
                current_app.logger.info(message)

        # Return JSON response for API requests, HTML for others
        if request_path.startswith("/api/") or request_path.startswith("/socket.io/"):
            resp = make_response(
                jsonify({"error": "Endpoint not found"}),
                404,
            )
        else:
            resp = make_response(
                "<h1>Page Not Found</h1><p>The requested page could not be found.</p>",
                404,
            )
        return resp

    # Global error handler for unhandled exceptions (excluding HTTPExceptions)
    @flask_app.errorhandler(Exception)
    def handle_global_exception(e):
        # Don't handle HTTPExceptions that have specific handlers (like 404)
        if isinstance(e, HTTPException) and hasattr(e, "code") and e.code is not None:
            # Let specific handlers deal with HTTP status codes
            raise e

        code = 500
        if hasattr(current_app, "logger"):
            current_app.logger.error(f"Unhandled exception: {e}")
        resp = make_response(
            jsonify({"error": "Sorry, something went wrong. Please try again later."}),
            code,
        )
        return resp

    # If socketio is None (disabled), return only Flask app for gunicorn compatibility
    if socketio is None:
        return flask_app
    return flask_app, socketio
