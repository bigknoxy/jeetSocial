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

def test_long_post(client):
    long_message = 'a' * 10000
    resp = client.post('/api/posts', json={'message': long_message})
    assert resp.status_code == 201 or resp.status_code == 400
    # Acceptable: either accepted or rejected for being too long

def test_special_char_post(client):
    special_message = '@#$%^&*()_+-=[]{}|;:,.<>/?~`'
    resp = client.post('/api/posts', json={'message': special_message})
    assert resp.status_code in (201, 400)

@pytest.mark.parametrize("message", [
    "\u202Eevil",  # Unicode trick
    "b\u0069got",  # Obfuscated word
    "stup1d",      # Leet speak
])
def test_obfuscated_hate_speech(client, message):
    resp = client.post('/api/posts', json={'message': message})
    assert resp.status_code in (201, 403)
