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
    format_display_timestamp,
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
        try:
            val = os.getenv("ENABLE_KINDNESS_POINTS", "0")
            current_app.logger.debug(f"[KINDNESS-SERVER] ENABLE_KINDNESS_POINTS={val}")
        except Exception:
            pass
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
    post = db.session.get(Post, post_id)
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
        try:
            val = os.getenv("ENABLE_KINDNESS_POINTS", "0")
            current_app.logger.debug(f"[KINDNESS-SERVER] ENABLE_KINDNESS_POINTS={val}")
        except Exception:
            pass
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
    post = db.session.get(Post, post_id)
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
    post = db.session.get(Post, post_id)
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
    Returns either a simple list of post items (when no paging params are present)
    or a paginated object with `posts`, `total_count`, `page`, `limit`, and `has_more`.

    The individual post items include both legacy and canonical fields to support
    existing tests and new contract/TDD tests:
      - id, username, message, content
      - timestamp, creation_timestamp (ISO 8601 UTC ending with 'Z')
      - kindness_points
      - meta: { display: str, future: bool }
    """
    from datetime import datetime

    since = request.args.get("since")
    # Detect whether client requested paginated behavior. When no paging args
    # are provided we return a flat list of posts (newer default); when `page`,
    # `limit`, or `since` is supplied, return the paginated object to preserve
    # backward compatibility for consumers that rely on it.
    has_paging = (
        "page" in request.args or "limit" in request.args or "since" in request.args
    )
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 50))
    query = Post.query
    if since:
        try:
            try:
                since_dt = datetime.fromisoformat(since)
            except ValueError:
                since_dt = datetime.utcfromtimestamp(float(since))
            query = query.filter(Post.timestamp >= since_dt)
        except Exception:
            pass

    # Support view=top to return posts ordered by kindness_points (within a time window)
    view = request.args.get("view", "latest")
    import time

    start_time = time.time()
    try:
        if view == "top":
            # Use the post_service DB-backed path to get top posts
            try:
                from app import post_service

                posts = post_service.top_posts(
                    session=db.session, limit=limit, window_hours=24
                )
                total_count = len(posts)
            except Exception as e:
                current_app.logger.error(f"Error in top_posts: {e}")
                # Fallback to empty list on error
                posts = []
                total_count = 0
        else:
            total_count = query.count()
            posts = (
                query.order_by(Post.timestamp.desc())
                .offset((page - 1) * limit)
                .limit(limit)
                .all()
            )

        latency = time.time() - start_time
        current_app.logger.info(
            f"GET /api/posts view={view} count={len(posts)} " f"latency={latency:.3f}s"
        )
    except Exception as e:
        latency = time.time() - start_time
        current_app.logger.error(f"Error in GET /api/posts: {e} latency={latency:.3f}s")
        raise

    def _iso_z(dt):
        if dt is None:
            return None
        try:
            s = dt.isoformat()
            # If tzinfo serialized as +00:00, prefer Z. If naive, append Z.
            if s.endswith("+00:00"):
                return s.replace("+00:00", "Z")
            if s.endswith("Z"):
                return s
            return s + "Z"
        except Exception:
            return None

    now = datetime.utcnow()
    items = []
    for p in posts:
        creation_ts = _iso_z(p.timestamp)
        try:
            future = bool(p.timestamp and p.timestamp > now)
        except Exception:
            future = False
        # If client supplies a `tz` query param, compute a server-side
        # human-friendly display object using format_display_timestamp so
        # tests can assert deterministic display output. Otherwise fall back to
        # canonical UTC ISO string to preserve backward compatibility.
        viewer_tz = request.args.get("tz")
        display_obj = None
        if viewer_tz and creation_ts:
            try:
                display_obj = format_display_timestamp(str(creation_ts), viewer_tz)
            except Exception:
                display_obj = None
        items.append(
            {
                "id": p.id,
                "username": p.username,
                "message": p.message,
                "content": p.message,
                "timestamp": creation_ts,
                "creation_timestamp": creation_ts,
                "kindness_points": int(getattr(p, "kindness_points", 0) or 0),
                "meta": {
                    "display": display_obj if display_obj is not None else creation_ts,
                    "future": future,
                },
            }
        )

    # When client did not ask for paging, return a flat list for easier
    # consumption in newer clients. Otherwise, preserve the legacy paginated
    # object shape.
    if not has_paging:
        return jsonify(items)

    has_more = (page * limit) < total_count
    return jsonify(
        {
            "posts": items,
            "total_count": total_count,
            "page": page,
            "limit": limit,
            "has_more": has_more,
        }
    )


@bp.route("/api/posts/<int:post_id>", methods=["GET"])
def get_post(post_id):
    """Return a single post by id with canonical fields and meta."""
    from datetime import datetime as _dt

    post = db.session.get(Post, post_id)
    if not post:
        return jsonify({"error": "Not found"}), 404

    def _iso_z(dt):
        if dt is None:
            return None
        s = dt.isoformat()
        if s.endswith("+00:00"):
            return s.replace("+00:00", "Z")
        if s.endswith("Z"):
            return s
        return s + "Z"

    creation_ts = _iso_z(post.timestamp)
    try:
        now = _dt.utcnow()
        future = bool(post.timestamp and post.timestamp > now)
    except Exception:
        future = False

    # Support optional `tz` query param for server-computed display fields
    viewer_tz = request.args.get("tz")
    display_obj = None
    if viewer_tz:
        try:
            display_obj = format_display_timestamp(str(creation_ts), viewer_tz)
        except Exception:
            display_obj = None

    return jsonify(
        {
            "id": post.id,
            "username": post.username,
            "message": post.message,
            "content": post.message,
            "creation_timestamp": creation_ts,
            "meta": {
                "display": display_obj if display_obj is not None else creation_ts,
                "future": future,
            },
        }
    )


def _create_post_impl():
    """
    Internal implementation for creating a post.
    Validates message/content, checks for hate speech, allows optional
    `creation_timestamp` override (TDD), generates username, and saves post.
    Returns JSON response with canonical fields including `creation_timestamp`
    and `meta` for display/future indicators.
    """
    data = request.get_json() or {}
    # Support both `message` (legacy) and `content` (new tests)
    message = (data.get("message") or data.get("content") or "").strip()
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

    # Server canonical timestamp: always use server UTC time for creation.
    post_kwargs = {"username": username, "message": message}
    from datetime import datetime as _dt

    post_kwargs["timestamp"] = _dt.utcnow()

    post = Post(**post_kwargs)
    db.session.add(post)
    try:
        db.session.commit()
    except Exception as e:
        current_app.logger.error(f"DB commit failed: {e}")
        db.session.rollback()
        return jsonify({"error": "Database error. Please try again later."}), 500

    # Prepare canonical response
    def _iso_z(dt):
        if dt is None:
            return None
        s = dt.isoformat()
        if s.endswith("+00:00"):
            return s.replace("+00:00", "Z")
        if s.endswith("Z"):
            return s
        return s + "Z"

    creation_ts_out = _iso_z(post.timestamp)
    try:
        from datetime import datetime as _dt

        now = _dt.utcnow()
        future_flag = bool(post.timestamp and post.timestamp > now)
    except Exception:
        future_flag = False

    return (
        jsonify(
            {
                "id": post.id,
                "username": post.username,
                "message": post.message,
                "content": post.message,
                "creation_timestamp": creation_ts_out,
                "meta": {"display": creation_ts_out, "future": future_flag},
            }
        ),
        201,
    )


# Dynamically apply rate limiting if enabled


def create_post():
    return _create_post_impl()


# Debug: lightweight flags endpoint (dev only)
@bp.route("/_debug/flags", methods=["GET"])
def debug_flags():
    """Return a small set of non-secret runtime flags for local debugging.
    This endpoint is disabled in production or if `DISABLE_DEBUG_FLAGS` is set.
    """
    if (
        os.getenv("FLASK_ENV") == "production"
        or os.getenv("DISABLE_DEBUG_FLAGS", "0") == "1"
    ):
        return jsonify({"error": "Not available"}), 404
    keys = ["ENABLE_KINDNESS_POINTS", "RATE_LIMIT", "FLASK_ENV"]
    flags = {k: os.getenv(k) for k in keys}
    return jsonify({"flags": flags}), 200


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
                "posting again. This helps keep jeetSocial spam-free and "
                "fair for everyone."
            ),
        )(create_post),
        methods=["POST"],
    )
else:
    bp.add_url_rule("/api/posts", view_func=create_post, methods=["POST"])
