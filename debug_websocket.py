#!/usr/bin/env python3
"""
Debug script to test WebSocket functionality
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))

from app import create_app


def test_websocket_connection():
    """Test WebSocket connection and events."""
    print("Creating app and socketio instance...")
    app, socketio_instance = create_app()
    app.config["TESTING"] = True

    print("Creating test client...")
    client = socketio_instance.test_client(app, flask_test_client=app.test_client())

    print(f"Client connected: {client.is_connected()}")

    print("Getting received events...")
    received = client.get_received()
    print(f"Received {len(received)} events:")
    for i, event in enumerate(received):
        print(f"  {i}: {event}")

    print("Disconnecting...")
    client.disconnect()
    print(f"Client connected after disconnect: {client.is_connected()}")


if __name__ == "__main__":
    test_websocket_connection()
