#!/usr/bin/env python3
"""
Simple WebSocket connection test for jeetSocial.
Tests basic connection and event handling.
"""

import time
import socketio

# Create a SocketIO client
sio = socketio.Client()


# Event handlers
@sio.event
def connect():
    print("✅ Connected to WebSocket server")
    print(f"   SID: {sio.sid}")

    # Join the feed room to receive new posts
    print("📢 Joining feed room...")
    sio.emit("join_feed")


@sio.event
def disconnect():
    print("❌ Disconnected from WebSocket server")


@sio.on("welcome")
def on_welcome(data):
    print(f"👋 Welcome message: {data}")


@sio.on("room_joined")
def on_room_joined(data):
    print(f"🏠 Room joined: {data}")


@sio.on("new_post")
def on_new_post(data):
    print(f"📝 New post received: {data}")


@sio.on("error")
def on_error(data):
    print(f"⚠️  Error: {data}")


@sio.on("pong")
def on_pong(data):
    print(f"🏓 Pong response: {data}")


def main():
    print("🚀 Testing WebSocket connection to jeetSocial...")
    print("   Server: http://localhost:5678")

    try:
        # Connect to the server
        print("🔌 Attempting to connect...")
        sio.connect(
            "http://localhost:5678", transports=["websocket"], socketio_path="socket.io"
        )

        # Send a ping to test connection
        print("📡 Sending ping...")
        sio.emit("ping")

        # Wait for events
        print("⏳ Waiting for events (5 seconds)...")
        time.sleep(5)

        # Test creating a post via HTTP API to trigger WebSocket broadcast
        print("📧 Creating test post via HTTP API...")
        import requests

        try:
            response = requests.post(
                "http://localhost:5678/api/posts",
                json={"content": "WebSocket test post - " + str(int(time.time()))},
                timeout=5,
            )
            if response.status_code == 201:
                print("✅ Test post created successfully")
                post_data = response.json()
                print(f"   Post ID: {post_data.get('id')}")
            else:
                print(f"❌ Failed to create test post: {response.status_code}")
        except Exception as e:
            print(f"❌ Error creating test post: {e}")

        # Wait more to receive the WebSocket broadcast
        print("⏳ Waiting for WebSocket broadcast (3 seconds)...")
        time.sleep(3)

    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False
    finally:
        # Disconnect
        try:
            sio.disconnect()
        except Exception:
            pass

    print("✅ WebSocket test completed")
    return True


if __name__ == "__main__":
    main()
