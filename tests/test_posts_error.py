"""
test_posts_error.py
"""
from app import create_app, db


def client():
    config_override = {
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'ENABLE_RATE_LIMITING': False
    }
    app = create_app(config_override)
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
        yield client
        with app.app_context():
            db.drop_all()


def test_invalid_json(client):
    resp = client.post(
        '/api/posts', data='not a json', content_type='application/json'
    )
    assert resp.status_code in (400, 422)


def test_missing_message_field(client):
    resp = client.post('/api/posts', json={})
    assert resp.status_code == 400
    data = resp.get_json()
    assert 'error' in data
