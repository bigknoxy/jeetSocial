#!/usr/bin/env python3
"""
Docker entry point for jeetSocial with WebSocket support
"""

import os
import sys
from dotenv import load_dotenv
from app import create_app

# Add current directory to Python path
sys.path.insert(0, ".")

# Load environment variables
load_dotenv()

# Create Flask app and SocketIO instance
result = create_app()
if isinstance(result, tuple) and len(result) == 2:
    app, socketio = result
else:
    app = result
    socketio = None

if __name__ == "__main__":
    if socketio is None:
        print("Error: SocketIO could not be initialized")
        exit(1)
    port = int(os.getenv("PORT", 5678))
    print(f"Starting jeetSocial with WebSocket support on 0.0.0.0:{port}")
    socketio.run(
        app, host="0.0.0.0", port=port, debug=False, allow_unsafe_werkzeug=True
    )
