import pytest
from app import create_app, db
from app.models import Post
from app.utils import is_hate_speech

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

def test_create_post(client):
    resp = client.post('/api/posts', json={'message': 'You are awesome!'})
    assert resp.status_code == 201
    data = resp.get_json()
    assert 'username' in data
    assert data['message'] == 'You are awesome!'

def test_hateful_post(client):
    resp = client.post('/api/posts', json={'message': 'I am stupid'})
    assert resp.status_code == 403
    data = resp.get_json()
    assert 'error' in data

def test_kind_post(client):
    resp = client.post('/api/posts', json={'message': 'You are awesome and loved!'})
    assert resp.status_code == 201
    data = resp.get_json()
    assert 'username' in data
    assert data['message'] == 'You are awesome and loved!'

def test_neutral_post(client):
    resp = client.post('/api/posts', json={'message': 'This is a post.'})
    assert resp.status_code == 201
    data = resp.get_json()
    assert 'username' in data
    assert data['message'] == 'This is a post.'

def test_empty_post(client):
    resp = client.post('/api/posts', json={'message': ''})
    assert resp.status_code == 400
    data = resp.get_json()
    assert 'error' in data

def test_post_rejection_reason_word_list():
    text = "You are a bigot!"
    is_hate, why, details = is_hate_speech(text)
    assert is_hate is True
    assert why == "word_list"
    assert details is not None
    assert details.lower() == "bigot"

def test_post_acceptance():
    text = "You are wonderful!"
    is_hate, why, details = is_hate_speech(text)
    assert is_hate is False
    assert why is None
    assert details is None
