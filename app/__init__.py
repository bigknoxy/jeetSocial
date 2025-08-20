"""
app/__init__.py

Main Flask application factory and global objects for jeetSocial.
- Loads environment variables
- Initializes Flask, SQLAlchemy, Migrate, and optional rate limiting
- Registers routes and error handlers
"""
import os
from dotenv import load_dotenv
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate

load_dotenv()

db = SQLAlchemy()
limiter = None


def create_app(config_override=None):
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "default-secret-key")
    app.config["ENABLE_RATE_LIMITING"] = (
        os.getenv("ENABLE_RATE_LIMITING", "true").lower() == "true"
    )

    if config_override:
        app.config.update(config_override)

    db.init_app(app)
    Migrate(app, db)

    import logging

    logging.basicConfig(level=logging.INFO)
    logging.info(f"Rate limiting enabled: {app.config['ENABLE_RATE_LIMITING']}")

    global limiter
    if app.config["ENABLE_RATE_LIMITING"]:
        limiter = Limiter(key_func=get_remote_address)
        limiter.init_app(app)
    else:
        limiter = None

    # Register blueprints/routes here
    from app.routes import bp as routes_bp

    app.register_blueprint(routes_bp)

    # Global error handler for all unhandled exceptions
    from flask import jsonify, current_app
    from werkzeug.exceptions import HTTPException

    @app.errorhandler(Exception)
    def handle_global_exception(e):
        code = 500
        if isinstance(e, HTTPException):
            code = e.code
        if hasattr(current_app, "logger"):
            current_app.logger.error(f"Unhandled exception: {e}")
        return (
            jsonify({"error": "Sorry, something went wrong. Please try again later."}),
            code,
        )

    return app
