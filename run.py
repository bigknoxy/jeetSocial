import subprocess
import sys
import os

# Run flask db upgrade (only if not using socketio direct mode)
use_socketio = os.getenv("USE_SOCKETIO", "false").lower() == "true"
if not use_socketio:
    try:
        subprocess.run(
            [sys.executable, "-m", "flask", "--app", "app:create_app", "db", "upgrade"]
        )
    except SystemExit:
        pass  # Ignore flask exit codes

# Check if we should use socketio (development) or gunicorn (production)
# use_socketio was already set above

if use_socketio:
    # Development mode with socketio
    from app import create_app

    result = create_app()
    if isinstance(result, tuple) and len(result) == 2:
        app, socketio = result
    else:
        app = result
        socketio = None

    if socketio is not None:
        # Get host and port from environment or use defaults
        host = os.getenv("HOST", "0.0.0.0")
        port = int(os.getenv("PORT", 5678))

        print(f"Starting jeetSocial with WebSocket support on {host}:{port}")
        socketio.run(app, host=host, port=port, debug=False)
    else:
        print("WebSocket not available, falling back to gunicorn")
        port = int(os.getenv("PORT", 5678))
        subprocess.run(["gunicorn", "--bind", f"0.0.0.0:{port}", "app:create_app()"])
else:
    # Production mode with gunicorn
    port = int(os.getenv("PORT", 5678))
    subprocess.run(["gunicorn", "--bind", f"0.0.0.0:{port}", "app:create_app()"])
