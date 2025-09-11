"""
app/routes.py

Flask routes and API endpoints for jeetSocial.
Handles static files, feed, and post creation with moderation
and rate limiting.
"""

from flask import Blueprint, request, jsonify, send_from_directory, current_app
from app import db, limiter
from app.models import Post
from app.utils import generate_username, is_hate_speech

bp = Blueprint("routes", __name__)


@bp.route("/")
def index():
    return send_from_directory("static", "index.html")


@bp.route("/static/<path:path>")
def static_files(path):
    return send_from_directory("static", path)


@bp.route("/api/posts", methods=["GET"])
def get_posts():
    """
    GET /api/posts
    Returns a paginated list of posts, optionally filtered by timestamp
    (since).
    Query params:
      - since: ISO8601 or timestamp (optional)
      - page: int (default 1)
      - limit: int (default 50)
    Response: JSON with posts, total_count, page, limit, has_more
    """
    since = request.args.get("since")
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 50))
    query = Post.query
    if since:
        from datetime import datetime

        try:
            try:
                since_dt = datetime.fromisoformat(since)
            except ValueError:
                since_dt = datetime.utcfromtimestamp(float(since))
            query = query.filter(Post.timestamp >= since_dt)
        except Exception:
            pass
    total_count = query.count()
    posts = (
        query.order_by(Post.timestamp.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    has_more = (page * limit) < total_count
    return jsonify(
        {
            "posts": [
                {
                    "id": p.id,
                    "username": p.username,
                    "message": p.message,
                    "timestamp": p.timestamp.isoformat(),
                }
                for p in posts
            ],
            "total_count": total_count,
            "page": page,
            "limit": limit,
            "has_more": has_more,
        }
    )


def _create_post_impl():
    """
    Internal implementation for creating a post.
    Validates message, checks for hate speech, generates username,
    and saves post.
    Returns JSON response with post or error.
    """
    data = request.get_json()
    message = data.get("message", "").strip()
    if not message:
        return jsonify({"error": "Message required"}), 400
    if len(message) > 280:
        return jsonify({"error": "Message exceeds 280 character limit"}), 400
    is_hate, reason, details = is_hate_speech(message)
    if is_hate:
        return (
            jsonify(
                {
                    "error": (
                        f"Hateful content not allowed (detected by {reason}: {details})"
                    )
                }
            ),
            403,
        )
    username = generate_username()
    post = Post(username=username, message=message)
    db.session.add(post)
    try:
        db.session.commit()
    except Exception as e:
        current_app.logger.error(f"DB commit failed: {e}")
        db.session.rollback()
        return jsonify({"error": "Database error. Please try again later."}), 500
    return (
        jsonify(
            {
                "id": post.id,
                "username": post.username,
                "message": post.message,
                "timestamp": post.timestamp.isoformat(),
            }
        ),
        201,
    )


# Dynamically apply rate limiting if enabled


def create_post():
    return _create_post_impl()


import os

RATE_LIMIT = os.environ.get("RATE_LIMIT", "1/minute")

if limiter is not None:
    bp.add_url_rule(
        "/api/posts",
        view_func=limiter.shared_limit(
            RATE_LIMIT,
            scope="post",
            deduct_when=lambda response: response.status_code == 201,
            error_message=(
                "You are posting too quickly. Please wait a minute before "
                "posting again. This helps keep jeetSocial spam-free and fair "
                "for everyone."
            ),
        )(create_post),
        methods=["POST"],
    )
else:
    bp.add_url_rule("/api/posts", view_func=create_post, methods=["POST"])
