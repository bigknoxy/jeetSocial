"""
app/websocket.py

WebSocket event handlers for jeetSocial real-time functionality.
Handles client connections, room management, and event broadcasting.
"""

import logging
from flask import request
from flask_socketio import emit, join_room, leave_room
from app import socketio

# Configure logging
logger = logging.getLogger(__name__)

# Room constants
FEED_ROOM = "feed"
POST_ROOM_PREFIX = "post_"


@socketio.on("connect")
def handle_connect():
    """Handle client connection to WebSocket."""
    logger.info(f"Client connected: {request.sid}")

    # Send welcome message to newly connected client
    emit(
        "welcome",
        {
            "message": "Connected to jeetSocial real-time updates",
            "client_id": request.sid,
        },
    )

    # Optionally join feed room by default for all new posts
    # Comment this out if you want clients to explicitly join
    # join_room(FEED_ROOM)


@socketio.on("disconnect")
def handle_disconnect():
    """Handle client disconnection from WebSocket."""
    logger.info(f"Client disconnected: {request.sid}")


@socketio.on("join_feed")
def handle_join_feed():
    """Handle client joining the feed room for all post updates."""
    logger.info(f"Client {request.sid} joining feed room")
    join_room(FEED_ROOM)

    emit(
        "room_joined",
        {
            "room": FEED_ROOM,
            "message": "Joined feed room - you will receive all new posts",
        },
    )


@socketio.on("leave_feed")
def handle_leave_feed():
    """Handle client leaving the feed room."""
    logger.info(f"Client {request.sid} leaving feed room")
    leave_room(FEED_ROOM)

    emit(
        "room_left",
        {
            "room": FEED_ROOM,
            "message": "Left feed room - you will no longer receive new posts",
        },
    )


@socketio.on("join_post")
def handle_join_post(data):
    """Handle client joining a post-specific room for kindness updates.

    Args:
        data (dict): Must contain 'post_id' key
    """
    if not data or "post_id" not in data:
        logger.warning(
            f"Client {request.sid} attempted to join post room without post_id"
        )
        emit("error", {"message": "post_id is required to join post room"})
        return

    try:
        post_id = int(data["post_id"])
        room_name = f"{POST_ROOM_PREFIX}{post_id}"

        logger.info(f"Client {request.sid} joining post room: {room_name}")
        join_room(room_name)

        emit(
            "room_joined",
            {
                "room": room_name,
                "post_id": post_id,
                "message": f"Joined post room for post {post_id} - "
                f"you will receive kindness updates",
            },
        )

    except (ValueError, TypeError):
        logger.warning(
            f'Client {request.sid} provided invalid post_id: {data.get("post_id")}'
        )
        emit("error", {"message": "Invalid post_id - must be a number"})


@socketio.on("leave_post")
def handle_leave_post(data):
    """Handle client leaving a post-specific room.

    Args:
        data (dict): Must contain 'post_id' key
    """
    if not data or "post_id" not in data:
        logger.warning(
            f"Client {request.sid} attempted to leave post room without post_id"
        )
        emit("error", {"message": "post_id is required to leave post room"})
        return

    try:
        post_id = int(data["post_id"])
        room_name = f"{POST_ROOM_PREFIX}{post_id}"

        logger.info(f"Client {request.sid} leaving post room: {room_name}")
        leave_room(room_name)

        emit(
            "room_left",
            {
                "room": room_name,
                "post_id": post_id,
                "message": f"Left post room for post {post_id}",
            },
        )

    except (ValueError, TypeError):
        logger.warning(
            f'Client {request.sid} provided invalid post_id: {data.get("post_id")}'
        )
        emit("error", {"message": "Invalid post_id - must be a number"})


@socketio.on("ping")
def handle_ping():
    """Handle ping from client for connection health check."""
    emit("pong", {"timestamp": "pong"})


# Helper functions for broadcasting events (used by routes)


def broadcast_new_post(post_data):
    """Broadcast new post to all clients in feed room.

    Args:
        post_data (dict): Post data including id, content, username,
    kindness_points, created_at
    """
    logger.info(f'Broadcasting new post {post_data.get("id")} to feed room')
    socketio.emit("new_post", post_data, room=FEED_ROOM)


def broadcast_kindness_update(post_id, kindness_points, action="increment"):
    """Broadcast kindness point update to clients subscribed to specific post.

    Args:
        post_id (int): ID of the post
        kindness_points (int): New total kindness points
        action (str): 'increment' or 'decrement'
    """
    room_name = f"{POST_ROOM_PREFIX}{post_id}"
    update_data = {
        "post_id": post_id,
        "kindness_points": kindness_points,
        "action": action,
    }

    print(f"DEBUG: Broadcasting kindness update for post {post_id} to room {room_name}")
    print(f"DEBUG: socketio is {socketio}")
    logger.info(
        f"Broadcasting kindness update for post {post_id}: {kindness_points} points"
    )
    socketio.emit("kindness_update", update_data, room=room_name)
    print("DEBUG: Broadcast completed")


def broadcast_post_deleted(post_id):
    """Broadcast post deletion to relevant clients.

    Args:
        post_id (int): ID of the deleted post
    """
    # Broadcast to feed room
    socketio.emit("post_deleted", {"post_id": post_id}, room=FEED_ROOM)

    # Also broadcast to post-specific room in case anyone is viewing it
    room_name = f"{POST_ROOM_PREFIX}{post_id}"
    socketio.emit("post_deleted", {"post_id": post_id}, room=room_name)

    logger.info(f"Broadcasted post deletion for post {post_id}")


def get_client_count():
    """Get the current number of connected clients.

    Returns:
        int: Number of active WebSocket connections
    """
    # Note: This requires flask-socketio's internal state access
    # In production, you might want to track this manually
    try:
        # This is a simplified approach - actual implementation may vary
        return len(socketio.server.manager.get_participants("/", None))
    except Exception:
        return 0
