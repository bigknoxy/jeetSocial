import pytest
from app import app, db
from app.models import Post

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['RATELIMIT_ENABLED'] = False
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
        yield client
        with app.app_context():
            db.drop_all()

def test_create_post(client):
    resp = client.post('/api/posts', json={'message': 'Hello world'})
    assert resp.status_code == 201
    data = resp.get_json()
    assert 'username' in data
    assert data['message'] == 'Hello world'

def test_hateful_post(client):
    resp = client.post('/api/posts', json={'message': 'I am a bigot'})
    assert resp.status_code == 403
    data = resp.get_json()
    assert 'error' in data
