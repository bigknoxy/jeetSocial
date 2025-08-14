from flask import Blueprint, request, jsonify, send_from_directory, current_app
from app import db, limiter
from app.models import Post
from app.utils import generate_username, is_hate_speech, is_kind

bp = Blueprint('routes', __name__)

@bp.route('/')
def index():
    return send_from_directory('static', 'index.html')

@bp.route('/static/<path:path>')
def static_files(path):
    return send_from_directory('static', path)

@bp.route('/api/posts', methods=['GET'])
def get_posts():
    posts = Post.query.order_by(Post.timestamp.desc()).limit(50).all()
    return jsonify([
        {
            'id': p.id,
            'username': p.username,
            'message': p.message,
            'timestamp': p.timestamp.isoformat()
        } for p in posts
    ])

def _create_post_impl():
    data = request.get_json()
    message = data.get('message', '').strip()
    if not message:
        return jsonify({'error': 'Message required'}), 400
    is_hate, reason, details = is_hate_speech(message)
    if is_hate:
        return jsonify({'error': f'Hateful content not allowed (detected by {reason}: {details})'}), 403
    username = generate_username()
    post = Post(username=username, message=message)
    db.session.add(post)
    db.session.commit()
    return jsonify({
        'id': post.id,
        'username': post.username,
        'message': post.message,
        'timestamp': post.timestamp.isoformat()
    }), 201

# Dynamically apply rate limiting if enabled
if limiter is not None:
    @bp.route('/api/posts', methods=['POST'])
    @limiter.shared_limit(
        "1/minute",
        scope="post",
        deduct_when=lambda response: response.status_code == 201,
        error_message="You are posting too quickly. Please wait a minute before posting again. This helps keep jeetSocial spam-free and fair for everyone."
    )
    def create_post():
        return _create_post_impl()
else:
    @bp.route('/api/posts', methods=['POST'])
    def create_post():
        return _create_post_impl()

