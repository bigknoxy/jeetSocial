#!/usr/bin/env python3
import os
from app import create_app

os.environ["USE_SOCKETIO"] = "true"

result = create_app()
if isinstance(result, tuple) and len(result) == 2:
    app, socketio = result
else:
    app = result
    socketio = None

if socketio is None:
    print("Error: SocketIO could not be initialized")
    exit(1)

port = int(os.getenv("PORT", 5678))
print(f"Starting jeetSocial with WebSocket support on 0.0.0.0:{port}")
print(
    "Application initialized successfully. Server will run silently after this message."
)
print("Access the application at: http://localhost:{port}".format(port=port))

# Use the built-in socketio.run() which handles eventlet/gevent properly
# This is the recommended way to run Flask-SocketIO applications
socketio.run(app, host="0.0.0.0", port=port, debug=False, allow_unsafe_werkzeug=True)
