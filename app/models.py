"""
app/models.py

SQLAlchemy models for jeetSocial.
Defines the Post model for anonymous social posts.
"""
from app import db
from datetime import datetime


class Post(db.Model):
    """
    SQLAlchemy model for a social post.
    Fields:
      - id: Primary key
      - username: Random, anonymous username
      - message: Post content
      - timestamp: UTC datetime of post creation
    """

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(32), nullable=False)
    message = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
