"""
app/models.py

SQLAlchemy models for jeetSocial.
Defines the Post model for anonymous social posts.
"""

from app import db
from datetime import datetime


class Post(db.Model):
    __tablename__ = "post"

    """
    SQLAlchemy model for a social post.
    Fields:
      - id: Primary key
      - username: Random, anonymous username
      - message: Post content
      - timestamp: UTC datetime of post creation
      - kindness_points: integer count of kindness points (default 0)
    """

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(32), nullable=False)
    message = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    kindness_points = db.Column(db.Integer, default=0, nullable=False)


class KindnessVote(db.Model):
    __tablename__ = "kindness_votes"
    """
    Records a redeemed kindness token to prevent double-spend.
    Fields:
      - id: Primary key
      - post_id: FK to Post.id
      - token_hash: sha256 hash of token string (unique)
      - created_at: timestamp of redemption
    """

    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(
        db.Integer, db.ForeignKey("post.id"), nullable=False, index=True
    )
    token_hash = db.Column(db.String(64), unique=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    post = db.relationship("Post", backref=db.backref("kindness_votes", lazy="dynamic"))
