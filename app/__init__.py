from dotenv import load_dotenv
load_dotenv()
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate
import os

db = SQLAlchemy()
limiter = None

def create_app(config_override=None):
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default-secret-key')
    app.config['ENABLE_RATE_LIMITING'] = os.getenv('ENABLE_RATE_LIMITING', 'true').lower() == 'true'

    if config_override:
        app.config.update(config_override)

    db.init_app(app)
    migrate = Migrate(app, db)

    import logging
    logging.basicConfig(level=logging.INFO)
    logging.info(f"Rate limiting enabled: {app.config['ENABLE_RATE_LIMITING']}")

    global limiter
    if app.config['ENABLE_RATE_LIMITING']:
        limiter = Limiter(key_func=get_remote_address)
        limiter.init_app(app)
    else:
        limiter = None

    # Register blueprints/routes here
    from app.routes import bp as routes_bp
    app.register_blueprint(routes_bp)

    return app

