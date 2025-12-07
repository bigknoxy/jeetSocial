"""
Metrics Collection for Moderation Engine
Async metrics buffering and aggregation with Redis storage
"""

import json
import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from collections import defaultdict, deque

try:
    import redis.asyncio as redis
except ImportError:
    redis = None

from .data_models import ModerationLayer, MetricEvent


class MetricsCollector:
    """Async metrics collector with buffering and Redis storage"""

    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        buffer_size: int = 100,
        flush_interval_seconds: int = 5,
        key_prefix: str = "jeet:mod:",
    ):
        """
        Initialize metrics collector

        Args:
            redis_url: Redis connection URL
            buffer_size: Maximum events to buffer before auto-flush
            flush_interval_seconds: Seconds between auto-flushes
            key_prefix: Prefix for Redis keys
        """
        self.redis_url = redis_url
        self.buffer_size = buffer_size
        self.flush_interval_seconds = flush_interval_seconds
        self.key_prefix = key_prefix

        # In-memory buffer
        self.buffer: deque[MetricEvent] = deque(maxlen=buffer_size)

        # Aggregated stats
        self._stats = {
            "total_requests": 0,
            "layer_counts": defaultdict(int),
            "hate_detected_count": 0,
            "processing_times": deque(maxlen=1000),  # Keep last 1000 for avg
            "last_flush": None,
        }

        self._redis_client = None
        self._flush_task = None

    async def _get_redis_client(self):
        """Lazy initialization of Redis client"""
        if self._redis_client is None and redis is not None:
            self._redis_client = redis.from_url(
                self.redis_url,
                decode_responses=True,
                socket_timeout=2.0,
                socket_connect_timeout=2.0,
                retry_on_timeout=True,
            )
        return self._redis_client

    async def record_moderation_event(
        self,
        layer: ModerationLayer,
        is_hate: bool,
        processing_time_ms: float,
        content_hash: Optional[str] = None,
    ):
        """
        Record a moderation event

        Args:
            layer: Which layer handled the moderation
            is_hate: Whether hate speech was detected
            processing_time_ms: Processing time in milliseconds
            content_hash: Hash of content (for privacy)
        """
        event = MetricEvent(
            layer=layer,
            is_hate=is_hate,
            processing_time_ms=processing_time_ms,
            content_hash=content_hash,
        )

        # Add to buffer
        self.buffer.append(event)

        # Update aggregated stats
        self._update_stats(event)

        # Auto-flush if buffer is full
        if len(self.buffer) >= self.buffer_size:
            await self.flush()

        # Start auto-flush task if not running
        if self._flush_task is None or self._flush_task.done():
            self._flush_task = asyncio.create_task(self._auto_flush())

    def _update_stats(self, event: MetricEvent):
        """Update aggregated statistics"""
        self._stats["total_requests"] += 1
        self._stats["layer_counts"][event.layer.value] += 1
        if event.is_hate:
            self._stats["hate_detected_count"] += 1
        self._stats["processing_times"].append(event.processing_time_ms)

    async def _auto_flush(self):
        """Auto-flush task that runs periodically"""
        while self.buffer:
            await asyncio.sleep(self.flush_interval_seconds)
            if self.buffer:
                await self.flush()

    async def flush(self):
        """Flush buffered metrics to Redis"""
        if not self.buffer:
            return

        redis_client = await self._get_redis_client()
        if redis_client is None:
            return

        # Copy buffer and clear it
        events_to_flush = list(self.buffer)
        self.buffer.clear()

        try:
            # Prepare batch operations
            pipe = redis_client.pipeline()

            # Store raw metrics (time series)
            raw_key = self.key_prefix + "metrics:raw"
            for event in events_to_flush:
                pipe.rpush(raw_key, json.dumps(event.to_dict()))

            # Set TTL for raw metrics (7 days)
            pipe.expire(raw_key, 7 * 24 * 3600)

            # Update aggregated counters
            hourly_key = (
                self.key_prefix
                + f"stats:hourly:{datetime.utcnow().strftime('%Y-%m-%d-%H')}"
            )
            daily_key = (
                self.key_prefix
                + f"stats:daily:{datetime.utcnow().strftime('%Y-%m-%d')}"
            )

            for event in events_to_flush:
                # Increment layer counters
                pipe.hincrby(hourly_key, f"layer_{event.layer.value}", 1)
                pipe.hincrby(daily_key, f"layer_{event.layer.value}", 1)

                # Increment hate detection counter
                if event.is_hate:
                    pipe.hincrby(hourly_key, "hate_detected", 1)
                    pipe.hincrby(daily_key, "hate_detected", 1)

                # Update processing time stats
                pipe.hincrbyfloat(
                    hourly_key, "total_processing_time_ms", event.processing_time_ms
                )
                pipe.hincrbyfloat(
                    daily_key, "total_processing_time_ms", event.processing_time_ms
                )

            # Set TTLs for aggregated stats
            pipe.expire(hourly_key, 7 * 24 * 3600)  # 7 days
            pipe.expire(daily_key, 30 * 24 * 3600)  # 30 days

            # Execute pipeline
            await pipe.execute()

            self._stats["last_flush"] = datetime.utcnow()

        except Exception as e:
            print(f"Error flushing metrics to Redis: {e}")
            # Re-add events to buffer if Redis failed
            for event in events_to_flush:
                if len(self.buffer) < self.buffer.maxlen:
                    self.buffer.append(event)

    def get_aggregated_stats(self) -> Dict[str, Any]:
        """Get current aggregated statistics"""
        stats = dict(self._stats)

        # Calculate average processing time
        if stats["processing_times"]:
            stats["avg_processing_time_ms"] = sum(stats["processing_times"]) / len(
                stats["processing_times"]
            )
            stats["min_processing_time_ms"] = min(stats["processing_times"])
            stats["max_processing_time_ms"] = max(stats["processing_times"])
        else:
            stats["avg_processing_time_ms"] = 0.0
            stats["min_processing_time_ms"] = 0.0
            stats["max_processing_time_ms"] = 0.0

        # Calculate hate detection rate
        if stats["total_requests"] > 0:
            stats["hate_detection_rate"] = (
                stats["hate_detected_count"] / stats["total_requests"]
            )
        else:
            stats["hate_detection_rate"] = 0.0

        # Convert defaultdict to regular dict
        stats["layer_counts"] = dict(stats["layer_counts"])

        # Remove processing_times from returned stats (too large)
        del stats["processing_times"]

        return stats

    async def get_redis_stats(self) -> Dict[str, Any]:
        """Get statistics from Redis"""
        redis_client = await self._get_redis_client()
        if redis_client is None:
            return {"redis_available": False}

        try:
            # Get current hour and day keys
            hourly_key = (
                self.key_prefix
                + f"stats:hourly:{datetime.utcnow().strftime('%Y-%m-%d-%H')}"
            )
            daily_key = (
                self.key_prefix
                + f"stats:daily:{datetime.utcnow().strftime('%Y-%m-%d')}"
            )

            pipe = redis_client.pipeline()
            pipe.hgetall(hourly_key)
            pipe.hgetall(daily_key)
            pipe.llen(self.key_prefix + "metrics:raw")

            hourly_stats, daily_stats, raw_count = await pipe.execute()

            return {
                "redis_available": True,
                "hourly_stats": hourly_stats,
                "daily_stats": daily_stats,
                "raw_metrics_count": raw_count,
                "last_flush": (
                    self._stats["last_flush"].isoformat()
                    if self._stats["last_flush"]
                    else None
                ),
            }

        except Exception as e:
            return {"redis_available": False, "error": str(e)}

    async def clear_metrics(self):
        """Clear all metrics from Redis and local buffer"""
        # Clear local buffer
        self.buffer.clear()

        # Reset local stats
        self._stats = {
            "total_requests": 0,
            "layer_counts": defaultdict(int),
            "hate_detected_count": 0,
            "processing_times": deque(maxlen=1000),
            "last_flush": None,
        }

        # Clear Redis metrics
        redis_client = await self._get_redis_client()
        if redis_client is not None:
            try:
                # Delete all keys with our prefix
                pattern = self.key_prefix + "*"
                keys = await redis_client.keys(pattern)
                if keys:
                    await redis_client.delete(*keys)
            except Exception as e:
                print(f"Error clearing Redis metrics: {e}")

    async def get_hourly_trend(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get hourly trend data for the last N hours"""
        redis_client = await self._get_redis_client()
        if redis_client is None:
            return []

        trend_data = []

        for i in range(hours):
            hour_dt = datetime.utcnow() - timedelta(hours=i)
            hour_key = (
                self.key_prefix + f"stats:hourly:{hour_dt.strftime('%Y-%m-%d-%H')}"
            )

            try:
                hour_stats = await redis_client.hgetall(hour_key)
                if hour_stats:
                    trend_data.append(
                        {"hour": hour_dt.isoformat(), "stats": hour_stats}
                    )
            except Exception as e:
                print(f"Error getting hourly trend for {hour_dt}: {e}")

        return trend_data

    async def __aenter__(self):
        """Async context manager entry"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit - ensure final flush"""
        if self.buffer:
            await self.flush()
        if self._flush_task and not self._flush_task.done():
            self._flush_task.cancel()
            try:
                await self._flush_task
            except asyncio.CancelledError:
                pass
