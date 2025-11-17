"""
Temporary WebSocket test file to verify fixture approach works.
"""

import pytest


@pytest.fixture
def app_with_socketio():
    """Fixture providing fresh Flask app and SocketIO instance for each test."""
    from app import create_app

    config_override = {
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "ENABLE_RATE_LIMITING": False,
    }

    result = create_app(config_override)
    # Handle tuple return from create_app()
    if isinstance(result, tuple):
        app, socketio_instance = result
    else:
        app = result
        socketio_instance = None

    app.config["TESTING"] = True
    return app, socketio_instance


class TestWebSocketConnectionWithFixture:
    """Test WebSocket connection using fixtures for proper isolation."""

    def test_connect_event_emits_welcome(self, app_with_socketio):
        """Test that connecting emits a welcome event."""
        app, socketio_instance = app_with_socketio

        with app.app_context():
            client = socketio_instance.test_client(
                app, flask_test_client=app.test_client()
            )

            # Connect the client
            client.connect()

            # Check for welcome message
            received = client.get_received()
            assert len(received) > 0

            # Should have a welcome event
            welcome_events = [event for event in received if event["name"] == "welcome"]
            assert len(welcome_events) > 0

            client.disconnect()

    def test_new_post_broadcast(self, app_with_socketio):
        """Test that new posts are broadcast to feed room subscribers."""
        app, socketio_instance = app_with_socketio

        with app.app_context():
            # Create two clients - one that joins feed room, one that doesn't
            feed_client = socketio_instance.test_client(
                app, flask_test_client=app.test_client()
            )
            regular_client = socketio_instance.test_client(
                app, flask_test_client=app.test_client()
            )

            # Connect both clients
            feed_client.connect()
            regular_client.connect()

            # Join feed room
            feed_client.emit("join_feed")

            # Simulate new post event (this would normally come from routes)
            post_data = {
                "id": 1,
                "content": "Test post",
                "username": "AnonymousUser",
                "kindness_points": 0,
                "created_at": "2025-01-01T00:00:00Z",
            }

            # Emit new post event to feed room
            socketio_instance.emit("new_post", post_data, room="feed")

            # Check that feed client receives the event
            feed_received = feed_client.get_received()
            post_events = [
                event for event in feed_received if event["name"] == "new_post"
            ]
            assert len(post_events) > 0

            # Check that regular client doesn't receive the event
            regular_received = regular_client.get_received()
            regular_post_events = [
                event for event in regular_received if event["name"] == "new_post"
            ]
            assert len(regular_post_events) == 0

            feed_client.disconnect()
            regular_client.disconnect()

    def test_kindness_update_broadcast(self, app_with_socketio):
        """Test that kindness point updates are broadcast to post room subscribers."""
        app, socketio_instance = app_with_socketio

        with app.app_context():
            # Create clients for different post rooms
            post1_client = socketio_instance.test_client(
                app, flask_test_client=app.test_client()
            )
            post2_client = socketio_instance.test_client(
                app, flask_test_client=app.test_client()
            )

            # Connect both clients
            post1_client.connect()
            post2_client.connect()

            # Join different post rooms
            post1_client.emit("join_post", {"post_id": 1})
            post2_client.emit("join_post", {"post_id": 2})

            # Simulate kindness update for post 1
            update_data = {"post_id": 1, "kindness_points": 5, "action": "increment"}

            socketio_instance.emit("kindness_update", update_data, room="post_1")

            # Check that post1 client receives the update
            post1_received = post1_client.get_received()
            update_events = [
                event for event in post1_received if event["name"] == "kindness_update"
            ]
            assert len(update_events) > 0

            # Check that post2 client doesn't receive the update
            post2_received = post2_client.get_received()
            post2_update_events = [
                event for event in post2_received if event["name"] == "kindness_update"
            ]
            assert len(post2_update_events) == 0

            post1_client.disconnect()
            post2_client.disconnect()
