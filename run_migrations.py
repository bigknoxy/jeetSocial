#!/usr/bin/env python3
"""Run database migrations for jeetSocial."""

from app import create_app

app, socketio = create_app()

with app.app_context():
    from flask_migrate import upgrade

    upgrade()
    print("✅ Database migrations completed successfully")
