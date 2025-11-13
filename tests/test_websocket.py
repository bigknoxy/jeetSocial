"""
WebSocket integration tests for jeetSocial.
Tests WebSocket connection, event handling, and real-time updates.
"""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock


def create_test_app():
    """Helper function to create test app with proper tuple handling."""
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

    # Initialize database tables
    with app.app_context():
        from app import db

        db.create_all()

    return app, socketio_instance


@pytest.fixture
def app_with_socketio():
    """Fixture providing fresh Flask app and SocketIO instance for each test."""
    return create_test_app()


class TestWebSocketConnection:
    """Test WebSocket connection and basic functionality."""

    def test_socketio_initialization(self):
        """Test that SocketIO is properly initialized with the Flask app."""
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

        # Test that socketio is attached to the app
        assert hasattr(app, "extensions")
        assert "socketio" in app.extensions

        # Test that socketio has the expected methods
        assert hasattr(socketio_instance, "emit")
        assert hasattr(socketio_instance, "on")
        # Test that room functions can be imported (they're not methods of socketio)
        from flask_socketio import join_room, leave_room

        assert callable(join_room)
        assert callable(leave_room)

    def test_client_can_connect(self):
        """Test that a WebSocket client can connect to the server."""
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

        # Create a test client
        client = socketio_instance.test_client(app, flask_test_client=app.test_client())

        # Test connection
        assert client.is_connected()

        # Disconnect
        client.disconnect()

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

    def test_disconnect_event_cleanup(self):
        """Test that disconnecting properly cleans up client state."""
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

        client = socketio_instance.test_client(app, flask_test_client=app.test_client())
        assert client.is_connected()

        # Disconnect and verify cleanup
        client.disconnect()
        assert not client.is_connected()


class TestWebSocketRoomManagement:
    """Test WebSocket room subscription and management."""

    def test_join_feed_room(self):
        """Test that clients can join the feed room for real-time updates."""
        app, socketio_instance = create_test_app()

        client = socketio_instance.test_client(app, flask_test_client=app.test_client())

        # Join feed room
        client.emit("join_feed")

        # Verify room membership (this would be tested via server-side state)
        # For now, just ensure the emit doesn't error
        received = client.get_received()

        client.disconnect()

    def test_join_post_room(self):
        """Test that clients can join a post-specific room."""
        app, socketio_instance = create_test_app()

        client = socketio_instance.test_client(app, flask_test_client=app.test_client())

        # Join post room
        post_id = 1
        client.emit("join_post", {"post_id": post_id})

        # Verify no errors
        received = client.get_received()

        client.disconnect()

    def test_leave_feed_room(self):
        """Test that clients can leave the feed room."""
        app, socketio_instance = create_test_app()

        client = socketio_instance.test_client(app, flask_test_client=app.test_client())

        # Join then leave feed room
        client.emit("join_feed")
        client.emit("leave_feed")

        received = client.get_received()

        client.disconnect()


class TestWebSocketPostEvents:
    """Test WebSocket events for post creation and updates."""

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
        post_events = [event for event in feed_received if event["name"] == "new_post"]
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
        update_events_post2 = [
            event for event in post2_received if event["name"] == "kindness_update"
        ]
        assert len(update_events_post2) == 0

        post1_client.disconnect()
        post2_client.disconnect()


class TestWebSocketErrorHandling:
    """Test WebSocket error handling and edge cases."""

    def test_invalid_room_join(self):
        """Test handling of invalid room join requests."""
        app, socketio_instance = create_test_app()

        client = socketio_instance.test_client(app, flask_test_client=app.test_client())

        # Try to join post room without post_id
        client.emit("join_post", {})

        # Should handle gracefully without crashing
        received = client.get_received()

        client.disconnect()

    def test_malformed_event_data(self):
        """Test handling of malformed event data."""
        app, socketio_instance = create_test_app()

        client = socketio_instance.test_client(app, flask_test_client=app.test_client())

        # Send malformed data
        client.emit("join_post", "invalid_data")

        # Should handle gracefully
        received = client.get_received()

        client.disconnect()

    def test_connection_with_invalid_namespace(self):
        """Test connection handling with invalid namespaces."""
        app, socketio_instance = create_test_app()

        # This test would verify that invalid namespace connections are rejected
        # For now, just ensure basic connection still works
        client = socketio_instance.test_client(app, flask_test_client=app.test_client())
        assert client.is_connected()

        client.disconnect()


class TestWebSocketIntegration:
    """Integration tests for WebSocket with existing routes."""

    @patch("app.routes.broadcast_new_post")
    def test_post_creation_emits_websocket_event(self, mock_broadcast):
        """Test that creating a post via API emits WebSocket event."""
        app, socketio_instance = create_test_app()

        with app.test_client() as client:
            # Mock post data
            post_data = {"content": "Test WebSocket post"}

            # This test will fail until WebSocket implementation is added
            # The mock_broadcast should be called when post is created
            response = client.post("/api/posts", json=post_data)

            # This assertion will fail until WebSocket is implemented
            mock_broadcast.assert_called_once()

            # Verify broadcast was called with correct parameters
            call_args = mock_broadcast.call_args
            # First argument should be post data dict
            assert isinstance(call_args[0][0], dict)  # Post data
            assert (
                call_args[0][0]["content"] == "Test WebSocket post"
            )  # Content matches
            assert "id" in call_args[0][0]  # Should have post ID

    @patch("app.routes.broadcast_kindness_update")
    def test_kindness_vote_emits_websocket_event(self, mock_broadcast):
        """Test that voting on kindness emits WebSocket event."""
        app, socketio_instance = create_test_app()

        # Enable kindness points for testing
        import os

        os.environ["ENABLE_KINDNESS_POINTS"] = "1"

        with app.test_client() as client:
            # First create a test post to vote on
            post_response = client.post(
                "/api/posts", json={"content": "Test post for kindness"}
            )
            post_data = post_response.get_json()
            post_id = post_data["id"]

            # Then get a token for the post
            token_response = client.post(
                "/api/kindness/token", json={"post_id": post_id}
            )
            token_data = token_response.get_json()

            # Then redeem the token (this is the actual voting action)
            response = client.post(
                "/api/kindness/redeem",
                json={"post_id": post_id, "token": token_data["token"]},
            )

            # This should now work since WebSocket is implemented
            mock_broadcast.assert_called_once()

            # Verify broadcast was called with correct parameters
            call_args = mock_broadcast.call_args
            # First argument should be post_id
            assert call_args[0][0] == post_id  # Post ID
            # Second argument should be kindness_points
            assert isinstance(call_args[0][1], int)  # Kindness points
            # Third argument should be action
            assert call_args[0][2] == "increment"  # Action
