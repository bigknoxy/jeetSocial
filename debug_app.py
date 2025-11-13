#!/usr/bin/env python3
"""Debug script to isolate Flask app initialization issue"""

import sys
import os

# Add current directory to Python path
sys.path.insert(0, "/app")

print("=== Debugging Flask App Creation ===")

# Test 1: Check if we can import Flask
try:
    from flask import Flask

    print("✅ Flask import successful")
except Exception as e:
    print(f"❌ Flask import failed: {e}")
    sys.exit(1)

# Test 2: Try to create a minimal Flask app directly
try:
    minimal_app = Flask(__name__)
    print("✅ Minimal Flask app creation successful")
    print(f"   Minimal app type: {type(minimal_app)}")
    print(
        f"   Minimal app has register_blueprint: {hasattr(minimal_app, 'register_blueprint')}"
    )
except Exception as e:
    print(f"❌ Minimal Flask app creation failed: {e}")
    sys.exit(1)

# Test 3: Try to import the app module
try:
    import app

    print(f"✅ App module import successful")
    print(f"   App module type: {type(app)}")
    print(f"   App module file: {getattr(app, '__file__', 'No file')}")
    print(f"   App module has create_app: {hasattr(app, 'create_app')}")
    print(
        f"   App module attributes: {[attr for attr in dir(app) if not attr.startswith('_')]}"
    )
except Exception as e:
    print(f"❌ App module import failed: {e}")
    sys.exit(1)

# Test 4: Try to call create_app directly
try:
    from app import create_app

    print("✅ create_app import successful")

    # Call create_app and see what we get
    result = create_app()
    print(f"✅ create_app call successful")
    print(f"   Result type: {type(result)}")
    print(f"   Result is tuple: {isinstance(result, tuple)}")

    if isinstance(result, tuple):
        app_instance, socketio_instance = result
        print(f"   App instance type: {type(app_instance)}")
        print(
            f"   App instance has register_blueprint: {hasattr(app_instance, 'register_blueprint')}"
        )
        print(f"   SocketIO instance type: {type(socketio_instance)}")
    else:
        app_instance = result
        print(f"   App instance type: {type(app_instance)}")
        print(
            f"   App instance has register_blueprint: {hasattr(app_instance, 'register_blueprint')}"
        )

except Exception as e:
    print(f"❌ create_app call failed: {e}")
    import traceback

    traceback.print_exc()
    sys.exit(1)

print("=== Debug Complete ===")
