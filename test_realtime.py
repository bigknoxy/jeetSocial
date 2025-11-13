#!/usr/bin/env python3

import time
import requests
import socketio

# Create a simple Socket.IO client to test real-time updates
sio = socketio.Client()


def on_connect():
    print("✅ Connected to WebSocket!")
    sio.emit("join_feed")


def on_connect_error(error):
    print(f"❌ Connection error: {error}")


def on_disconnect():
    print("🔌 Disconnected")


def on_welcome(data):
    print(f"👋 Welcome: {data}")


def on_room_joined(data):
    print(f"📝 Room joined: {data}")


def on_new_post(data):
    print(f"📨 NEW POST RECEIVED: {data}")


# Register event handlers
sio.on("connect", on_connect)
sio.on("connect_error", on_connect_error)
sio.on("disconnect", on_disconnect)
sio.on("welcome", on_welcome)
sio.on("room_joined", on_room_joined)
sio.on("new_post", on_new_post)

# Connect to the server
try:
    print("🔄 Connecting to WebSocket server...")
    sio.connect("http://localhost:5678")

    # Wait a moment for connection
    time.sleep(2)

    # Create a test post via HTTP API
    print("📤 Creating test post via HTTP API...")
    response = requests.post(
        "http://localhost:5678/api/posts",
        json={"message": "Python WebSocket test post - real-time update"},
        headers={"Content-Type": "application/json"},
    )

    if response.status_code == 201:
        post_data = response.json()
        print(f'✅ Post created: {post_data["id"]}')
    else:
        print(f"❌ Failed to create post: {response.status_code}")

    # Wait for WebSocket broadcast
    print("⏳ Waiting for WebSocket broadcast...")
    time.sleep(5)

except Exception as e:
    print(f"❌ Error: {e}")
finally:
    sio.disconnect()
    print("🔌 Disconnected")
