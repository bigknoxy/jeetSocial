#!/usr/bin/env python3
"""
Manual test for real-time WebSocket functionality
Tests post creation and kindness updates across multiple clients
"""

import sys
import time
import threading
from app import create_app


def test_realtime_posts():
    """Test real-time post updates across multiple clients."""
    print("=== Testing Real-time Post Updates ===")

    app, socketio_instance = create_app()
    app.config["TESTING"] = True

    # Create multiple clients
    client1 = socketio_instance.test_client(app, flask_test_client=app.test_client())
    client2 = socketio_instance.test_client(app, flask_test_client=app.test_client())

    print(f"Client 1 connected: {client1.is_connected()}")
    print(f"Client 2 connected: {client2.is_connected()}")

    # Both clients join feed room
    client1.emit("join_feed")
    client2.emit("join_feed")

    # Clear received events
    client1.get_received()
    client2.get_received()

    # Simulate new post via API
    post_data = {
        "id": 999,
        "content": "Real-time test post",
        "username": "TestUser",
        "kindness_points": 0,
        "created_at": "2025-01-01T00:00:00Z",
    }

    print("Broadcasting new post...")
    with app.app_context():
        socketio_instance.emit("new_post", post_data, room="feed")

    # Check if both clients received the post
    client1_received = client1.get_received()
    client2_received = client2.get_received()

    client1_posts = [e for e in client1_received if e["name"] == "new_post"]
    client2_posts = [e for e in client2_received if e["name"] == "new_post"]

    print(f"Client 1 received {len(client1_posts)} new post events")
    print(f"Client 2 received {len(client2_posts)} new post events")

    if len(client1_posts) > 0 and len(client2_posts) > 0:
        print("✅ Real-time post updates working across multiple clients!")
        return True
    else:
        print("❌ Real-time post updates NOT working")
        return False


def test_realtime_kindness():
    """Test real-time kindness updates across multiple clients."""
    print("\n=== Testing Real-time Kindness Updates ===")

    app, socketio_instance = create_app()
    app.config["TESTING"] = True

    # Import broadcast function after app is created
    try:
        from app.websocket import broadcast_kindness_update

        print("Successfully imported broadcast_kindness_update")
    except ImportError as e:
        print(f"Failed to import broadcast_kindness_update: {e}")
        return False

    # Create clients for specific post rooms
    client1 = socketio_instance.test_client(app, flask_test_client=app.test_client())
    client2 = socketio_instance.test_client(app, flask_test_client=app.test_client())

    # Join post-specific rooms
    print("Client 1 joining post room...")
    client1.emit("join_post", {"post_id": 999})
    print("Client 2 joining post room...")
    client2.emit("join_post", {"post_id": 999})

    # Clear events after joining
    client1.get_received()
    client2.get_received()
    print("Both clients joined post room")

    # Clear received events
    received1 = client1.get_received()
    received2 = client2.get_received()
    print(
        f"After joining rooms - Client1 received {len(received1)} events, Client2 received {len(received2)} events"
    )

    # Simulate kindness update
    update_data = {"post_id": 999, "kindness_points": 5, "action": "increment"}

    print("Broadcasting kindness update...")
    with app.app_context():
        broadcast_kindness_update(999, 5, "increment")
    print("Used broadcast_kindness_update function")

    print("Kindness update broadcasted")

    # Check if clients received the update
    client1_received = client1.get_received()
    client2_received = client2.get_received()

    print(f"After kindness update - Client1 received {len(client1_received)} events:")
    for i, event in enumerate(client1_received):
        print(f"  {i}: {event}")

    print(f"After kindness update - Client2 received {len(client2_received)} events:")
    for i, event in enumerate(client2_received):
        print(f"  {i}: {event}")

    client1_updates = [e for e in client1_received if e["name"] == "kindness_update"]
    client2_updates = [e for e in client2_received if e["name"] == "kindness_update"]

    print(f"Client 1 received {len(client1_updates)} kindness update events")
    print(f"Client 2 received {len(client2_updates)} kindness update events")

    if len(client1_updates) > 0 and len(client2_updates) > 0:
        print("✅ Real-time kindness updates working across multiple clients!")
        return True
    else:
        print("❌ Real-time kindness updates NOT working")
        return False


if __name__ == "__main__":
    posts_work = test_realtime_posts()
    kindness_work = test_realtime_kindness()

    print(f"\n=== Results ===")
    print(f"Real-time posts: {'✅ PASS' if posts_work else '❌ FAIL'}")
    print(f"Real-time kindness: {'✅ PASS' if kindness_work else '❌ FAIL'}")

    if posts_work and kindness_work:
        print("\n🎉 WebSocket implementation is working correctly!")
        sys.exit(0)
    else:
        print("\n⚠️  WebSocket implementation has issues")
        sys.exit(1)
