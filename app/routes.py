"""
app/routes.py

Flask routes and API endpoints for jeetSocial.
Handles static files, feed, and post creation with moderation
and rate limiting.
"""

from flask import Blueprint, request, jsonify, current_app
from app import db, limiter
from app.models import Post, KindnessVote
from app.utils import (
    generate_username,
    is_hate_speech,
    generate_kindness_token,
    verify_kindness_token,
    hash_token_for_storage,
)
import os

bp = Blueprint("routes", __name__)

# Kindness Points API Endpoints


@bp.route("/api/kindness/token", methods=["POST"])
def issue_kindness_token():
    # Debug: log incoming request headers/raw body for troubleshooting
    try:
        current_app.logger.debug(f"[KINDNESS] Headers: {dict(request.headers)}")
        raw_body = request.get_data(as_text=True)
        if raw_body:
            current_app.logger.debug(f"[KINDNESS] Raw body: {raw_body}")
    except Exception:
        current_app.logger.debug("[KINDNESS] Failed to log incoming request body")

    """Issue a new kindness token for a specific post."""
    if not os.getenv("ENABLE_KINDNESS_POINTS", "0") == "1":
        return jsonify({"error": "Feature disabled"}), 404

    # Accept JSON, form-encoded, or raw bodies
    def _parse_request_json():
        data = None
        try:
            if request.is_json:
                data = request.get_json(silent=True)
            if not data and request.form:
                data = request.form.to_dict()
            if not data:
                raw = request.get_data(as_text=True)
                if raw:
                    try:
                        import json as _json

                        data = _json.loads(raw)
                    except Exception:
                        # Try parsing as query-string format
                        from urllib.parse import parse_qs

                        parsed = parse_qs(raw)
                        if parsed:
                            data = {k: v[0] for k, v in parsed.items()}
        except Exception:
            data = None
        return data

    data = _parse_request_json()
    # Fallback: accept post_id from query string
    if not data or "post_id" not in data:
        post_id_arg = request.args.get("post_id")
        if post_id_arg:
            data = {"post_id": post_id_arg}
        else:
            # Print debugging information to stdout so Playwright captures it
            try:
                current_app.logger.debug(
                    f"[KINDNESS-SERVER] Headers: {dict(request.headers)}"
                )
                raw_body = request.get_data(as_text=True)
                if raw_body:
                    current_app.logger.debug(f"[KINDNESS-SERVER] Raw body: {raw_body}")
            except Exception:
                current_app.logger.debug(
                    "[KINDNESS-SERVER] Failed to dump request body"
                )
            return jsonify({"error": "Missing post_id"}), 400

    post_id = data["post_id"]

    # Verify post exists
    post = Post.query.get(post_id)
    if not post:
        return jsonify({"error": "Post not found"}), 404

    try:
        token = generate_kindness_token(post_id)
        return jsonify({"token": token, "expires_in": 300}), 200  # 5 minutes
    except Exception as exc:
        current_app.logger.error(f"Token generation failed: {exc}")
        return jsonify({"error": "Token generation failed"}), 500


@bp.route("/api/kindness/redeem", methods=["POST"])
def redeem_kindness_token():
    # Debug: log incoming request headers/raw body for troubleshooting
    try:
        current_app.logger.debug(f"[KINDNESS] Headers: {dict(request.headers)}")
        raw_body = request.get_data(as_text=True)
        if raw_body:
            current_app.logger.debug(f"[KINDNESS] Raw body: {raw_body}")
    except Exception:
        current_app.logger.debug("[KINDNESS] Failed to log incoming request body")

    """Redeem token to award kindness point to a post."""
    if not os.getenv("ENABLE_KINDNESS_POINTS", "0") == "1":
        return jsonify({"error": "Feature disabled"}), 404
    # Tolerant parsing similar to token issuance
    try:
        data = request.get_json(silent=True)
    except Exception:
        data = None
    if not data:
        # Try form or raw
        if request.form:
            data = request.form.to_dict()
        else:
            raw = request.get_data(as_text=True)
            try:
                import json as _json

                data = _json.loads(raw) if raw else None
            except Exception:
                data = None
    # Debug: print args and preliminary parsed data
    try:
        current_app.logger.debug(
            f"[KINDNESS-SERVER] request.args: {dict(request.args)}"
        )
        current_app.logger.debug(
            f"[KINDNESS-SERVER] parsed data before fallback: {data}"
        )
    except Exception:
        pass
    # Accept post_id/token from query string as fallback
    # (e.g., client may send them in the URL)
    if not data or "post_id" not in data or "token" not in data:
        post_id_arg = request.args.get("post_id")
        token_arg = request.args.get("token")
        try:
            current_app.logger.debug(
                f"[KINDNESS-SERVER] fallback args - post_id_arg: {post_id_arg} "
                f"token_arg present? {bool(token_arg)}"
            )
        except Exception:
            pass
        if post_id_arg and token_arg:
            data = {"post_id": post_id_arg, "token": token_arg}
        else:
            try:
                current_app.logger.debug(
                    f"[KINDNESS-SERVER] Headers: {dict(request.headers)}"
                )
                raw = request.get_data(as_text=True)
                if raw:
                    current_app.logger.debug(f"[KINDNESS-SERVER] Raw body: {raw}")
            except Exception:
                current_app.logger.debug(
                    "[KINDNESS-SERVER] Failed to dump request body"
                )
            return jsonify({"error": "Missing post_id or token"}), 400
    # Debug: final data used for redeem
    try:
        current_app.logger.debug(f"[KINDNESS-SERVER] final redeem data: {data}")
    except Exception:
        pass
    post_id = data["post_id"]
    token_string = data["token"]
    # Verify token
    nonce = verify_kindness_token(token_string)
    if not nonce:
        return jsonify({"error": "Invalid or expired token"}), 400
    # Coerce post_id to int (protect against string IDs from JSON or other sources)
    try:
        post_id = int(post_id)
    except Exception:
        return jsonify({"error": "Invalid post_id"}), 400
    # Check if post exists
    post = Post.query.get(post_id)
    if not post:
        return jsonify({"error": "Post not found"}), 404
    # Create token hash for uniqueness
    token_hash = hash_token_for_storage(token_string)
    try:
        # Use explicit commit/rollback to avoid nested transaction issues
        try:
            from sqlalchemy.exc import IntegrityError
        except Exception:
            IntegrityError = None
        vote = KindnessVote()
        vote.post_id = post_id
        vote.token_hash = token_hash
        db.session.add(vote)
        # Flush to trigger DB constraint checks before commit
        db.session.flush()
        post.kindness_points += 1
        db.session.commit()
        return jsonify({"success": True, "new_points": post.kindness_points}), 200
    except Exception as e:
        import traceback

        current_app.logger.exception("Error redeeming kindness token")
        try:
            tb = traceback.format_exc()
            print("[KINDNESS-SERVER] Redeem exception traceback:")
            print(tb)
        except Exception:
            print("[KINDNESS-SERVER] Failed to print traceback")
        # Prefer explicit SQLAlchemy IntegrityError detection when available
        try:
            from sqlalchemy.exc import IntegrityError
        except Exception:
            IntegrityError = None
        if IntegrityError is not None and isinstance(e, IntegrityError):
            try:
                db.session.rollback()
            except Exception:
                pass
            return jsonify({"error": "Token already used"}), 409
        # Fallback: inspect error message for uniqueness indicators
        if any(
            sub in str(e).lower()
            for sub in ("unique constraint", "duplicate", "integrityerror")
        ):
            try:
                db.session.rollback()
            except Exception:
                pass
            return jsonify({"error": "Token already used"}), 409
        # Unknown DB error — rollback and return generic 500
        try:
            db.session.rollback()
        except Exception:
            pass
        return jsonify({"error": "Database error"}), 500


@bp.route("/api/posts/<int:post_id>/kindness", methods=["GET"])
def get_post_kindness(post_id):
    """Get kindness points for a specific post."""
    post = Post.query.get(post_id)
    if not post:
        return jsonify({"error": "Post not found"}), 404
    return jsonify({"kindness_points": post.kindness_points}), 200


@bp.route("/")
def index():
    # Use Flask's configured static file serving to avoid working-directory issues
    return current_app.send_static_file("index.html")


@bp.route("/static/<path:path>")
def static_files(path):
    # Delegate to Flask's static file handler which uses `current_app.static_folder`.
    return current_app.send_static_file(path)


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
                    "kindness_points": int(getattr(p, "kindness_points", 0) or 0),
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
    data = request.get_json() or {}
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
