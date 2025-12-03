#!/usr/bin/env python3
"""
Complete real-time WebSocket test for jeetSocial.
Tests multiple clients and real-time post broadcasting.
"""

import time
import requests
import socketio

# Test configuration
BASE_URL = "http://localhost:5678"
POST_CONTENT = "Real-time test post from multi-client test"


class WebSocketClient:
    def __init__(self, client_id):
        self.client_id = client_id
        self.sio = socketio.Client()
        self.received_posts = []
        self.setup_handlers()

    def setup_handlers(self):
        @self.sio.event
        def connect():
            print(f"🔌 Client {self.client_id} connected")
            self.sio.emit("join_feed")

        @self.sio.event
        def disconnect():
            print(f"❌ Client {self.client_id} disconnected")

        @self.sio.on("welcome")
        def on_welcome(data):
            print(f"👋 Client {self.client_id}: {data['message']}")

        @self.sio.on("room_joined")
        def on_room_joined(data):
            print(f"🏠 Client {self.client_id}: {data['message']}")

        @self.sio.on("new_post")
        def on_new_post(data):
            print(
                f"📝 Client {self.client_id} received new post: "
                f"{data['id']} - {data['content'][:30]}..."
            )
            self.received_posts.append(data)

        @self.sio.on("error")
        def on_error(data):
            print(f"⚠️  Client {self.client_id} error: {data}")

    def connect(self):
        try:
            self.sio.connect(BASE_URL, transports=["websocket"])
            return True
        except Exception as e:
            print(f"❌ Client {self.client_id} connection failed: {e}")
            return False

    def disconnect(self):
        try:
            self.sio.disconnect()
        except Exception:
            pass


def create_test_post(content_suffix):
    """Create a test post via HTTP API."""
    try:
        response = requests.post(
            f"{BASE_URL}/api/posts",
            json={"content": f"{POST_CONTENT} {content_suffix}"},
            timeout=5,
        )
        if response.status_code == 201:
            post_data = response.json()
            print(f"✅ Created post {post_data['id']}: {post_data['content'][:30]}...")
            return post_data
        else:
            print(f"❌ Failed to create post: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error creating post: {e}")
        return None


def main():
    print("🚀 Starting complete real-time WebSocket test...")
    print(f"   Server: {BASE_URL}")
    print()

    # Create multiple WebSocket clients
    clients = []
    num_clients = 3

    print(f"📡 Connecting {num_clients} WebSocket clients...")
    for i in range(num_clients):
        client = WebSocketClient(i + 1)
        if client.connect():
            clients.append(client)
            time.sleep(0.5)  # Stagger connections
        else:
            print(f"❌ Failed to connect client {i + 1}")

    if not clients:
        print("❌ No clients connected successfully")
        return False

    print(f"✅ {len(clients)} clients connected successfully")
    print()

    # Wait for all clients to join feed room
    print("⏳ Waiting for clients to join feed room...")
    time.sleep(2)

    # Test creating multiple posts and verify real-time broadcasting
    num_posts = 3
    print(f"📧 Creating {num_posts} test posts via HTTP API...")

    for i in range(num_posts):
        post_data = create_test_post(f"#{i + 1}")
        if post_data:
            # Wait for WebSocket broadcast
            time.sleep(1)

    print()
    print("⏳ Waiting for final WebSocket broadcasts...")
    time.sleep(3)

    # Analyze results
    print()
    print("📊 Results Analysis:")
    print("=" * 50)

    total_received = sum(len(client.received_posts) for client in clients)
    print(f"Total posts received by all clients: {total_received}")

    for i, client in enumerate(clients):
        print(f"Client {client.client_id}: {len(client.received_posts)} posts received")
        for post in client.received_posts:
            print(f"  - Post {post['id']}: {post['content'][:40]}...")

    # Check if all clients received all new posts
    expected_posts = num_posts
    success = all(len(client.received_posts) == expected_posts for client in clients)

    print()
    if success:
        print("🎉 SUCCESS: All clients received all new posts in real-time!")
        print("✅ WebSocket real-time functionality is working correctly")
    else:
        print("❌ FAILURE: Some clients did not receive all posts")
        print("⚠️  WebSocket real-time functionality needs investigation")

    # Cleanup
    print()
    print("🧹 Disconnecting clients...")
    for client in clients:
        client.disconnect()

    return success


if __name__ == "__main__":
    main()
