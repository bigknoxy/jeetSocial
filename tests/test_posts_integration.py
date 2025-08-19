import pytest
from app import create_app, db
from app.models import Post

@pytest.fixture
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

def test_post_and_fetch(client):
    # Create post
    resp = client.post('/api/posts', json={'message': 'Integration test post'})
    assert resp.status_code == 201
    # Fetch posts
    resp = client.get('/api/posts')
    assert resp.status_code == 200
    data = resp.get_json()
    assert any(post['message'] == 'Integration test post' for post in data)

def test_db_error_handling(client, monkeypatch):
    # Simulate DB error
    def fail_commit():
        raise Exception("DB error simulated")
    monkeypatch.setattr(db.session, "commit", fail_commit)
    resp = client.post('/api/posts', json={'message': 'Should fail'})
    assert resp.status_code in (500, 400, 403)
