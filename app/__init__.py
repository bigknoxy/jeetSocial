from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default-secret-key')
db = SQLAlchemy(app)

# Feature flag for rate limiting
app.config['ENABLE_RATE_LIMITING'] = os.getenv('ENABLE_RATE_LIMITING', 'true').lower() == 'true'

if app.config['ENABLE_RATE_LIMITING']:
    limiter = Limiter(key_func=get_remote_address)
    limiter.init_app(app)
else:
    limiter = None

from app import routes

with app.app_context():
    db.create_all()
