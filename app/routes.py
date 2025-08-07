from flask import request, jsonify, send_from_directory
from app import app, db, limiter
from app.models import Post
from app.utils import generate_username, is_hateful

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/static/<path:path>')
def static_files(path):
    return send_from_directory('static', path)

@app.route('/api/posts', methods=['GET'])
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

from flask import current_app


if (
    app.config.get('ENABLE_RATE_LIMITING', True)
    and not app.config.get('TESTING', False)
    and limiter is not None
):
    @app.route('/api/posts', methods=['POST'])
    @limiter.shared_limit(
        "1/minute",
        scope="post",
        deduct_when=lambda response: response.status_code == 201,
        error_message="You are posting too quickly. Please wait a minute before posting again. This helps keep jeetSocial spam-free and fair for everyone."
    )
    def create_post():
        data = request.get_json()
        message = data.get('message', '').strip()
        if not message:
            return jsonify({'error': 'Message required'}), 400
        if is_hateful(message):
            return jsonify({'error': 'Hateful content not allowed'}), 403
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
else:
    @app.route('/api/posts', methods=['POST'])
    def create_post():
        data = request.get_json()
        message = data.get('message', '').strip()
        if not message:
            return jsonify({'error': 'Message required'}), 400
        if is_hateful(message):
            return jsonify({'error': 'Hateful content not allowed'}), 403
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

