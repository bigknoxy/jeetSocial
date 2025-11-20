"""
Intelligent Cache for Moderation Engine
L1 (in-memory LRU) + L2 (Redis) caching with privacy compliance
"""

import json
import hashlib
import time
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from collections import OrderedDict

try:
    import redis.asyncio as redis
except ImportError:
    redis = None

from .data_models import ModerationResult, CacheEntry


class IntelligentCache:
    """Two-level cache system with L1 (memory) and L2 (Redis)"""

    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        l1_size: int = 1000,
        l1_ttl_seconds: int = 300,  # 5 minutes
        l2_ttl_seconds: int = 7776000,  # 90 days
        key_prefix: str = "jeet:mod:cache:",
    ):
        """
        Initialize intelligent cache

        Args:
            redis_url: Redis connection URL
            l1_size: Maximum items in L1 cache
            l1_ttl_seconds: TTL for L1 cache entries
            l2_ttl_seconds: TTL for L2 cache entries (Redis)
            key_prefix: Prefix for Redis keys
        """
        self.redis_url = redis_url
        self.l1_size = l1_size
        self.l1_ttl_seconds = l1_ttl_seconds
        self.l2_ttl_seconds = l2_ttl_seconds
        self.key_prefix = key_prefix

        # L1 cache (in-memory LRU)
        self._l1_cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self._redis_client = None

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

    def _generate_cache_key(self, content: str) -> str:
        """Generate SHA-256 hash for content (privacy-compliant)"""
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    async def get(self, content: str) -> Optional[ModerationResult]:
        """
        Get moderation result from cache (L1 -> L2)

        Args:
            content: Content to check in cache

        Returns:
            ModerationResult if found, None otherwise
        """
        cache_key = self._generate_cache_key(content)

        # Check L1 cache first
        if cache_key in self._l1_cache:
            entry = self._l1_cache[cache_key]

            # Check TTL
            if time.time() - entry.last_accessed.timestamp() < self.l1_ttl_seconds:
                # Move to end (LRU update)
                self._l1_cache.move_to_end(cache_key)
                entry.access_count += 1
                entry.last_accessed = datetime.utcnow()
                return entry.result
            else:
                # Expired, remove from L1
                del self._l1_cache[cache_key]

        # Check L2 cache (Redis)
        redis_client = await self._get_redis_client()
        if redis_client is not None:
            try:
                cached_data = await redis_client.get(self.key_prefix + cache_key)
                if cached_data:
                    cache_entry = CacheEntry.from_dict(json.loads(cached_data))

                    # Store in L1 cache
                    self._store_in_l1(cache_key, cache_entry)

                    return cache_entry.result
            except Exception as e:
                # Redis error, continue without cache
                print(f"Redis cache error: {e}")

        return None

    async def set(
        self,
        content: str,
        result: ModerationResult,
        vector: Optional[List[float]] = None,
    ):
        """
        Store moderation result in cache (L1 + L2)

        Args:
            content: Original content (will be hashed)
            result: Moderation result to cache
            vector: Optional vector for similarity caching
        """
        cache_key = self._generate_cache_key(content)
        cache_entry = CacheEntry(
            result=result,
            access_count=1,
            last_accessed=datetime.utcnow(),
            vector=vector,
        )

        # Store in L1 cache
        self._store_in_l1(cache_key, cache_entry)

        # Store in L2 cache (Redis)
        redis_client = await self._get_redis_client()
        if redis_client is not None:
            try:
                await redis_client.setex(
                    self.key_prefix + cache_key,
                    self.l2_ttl_seconds,
                    json.dumps(cache_entry.to_dict()),
                )
            except Exception as e:
                # Redis error, continue without L2 cache
                print(f"Redis cache set error: {e}")

    def _store_in_l1(self, cache_key: str, cache_entry: CacheEntry):
        """Store entry in L1 cache with LRU eviction"""
        # Remove oldest if at capacity
        if len(self._l1_cache) >= self.l1_size:
            oldest_key = next(iter(self._l1_cache))
            del self._l1_cache[oldest_key]

        self._l1_cache[cache_key] = cache_entry
        self._l1_cache.move_to_end(cache_key)

    async def get_similar(
        self, vector: List[float], threshold: float = 0.85
    ) -> List[ModerationResult]:
        """
        Find cached entries with similar vectors (for Layer 3 optimization)

        Args:
            vector: Query vector
            threshold: Similarity threshold

        Returns:
            List of similar moderation results
        """
        similar_results = []

        # Check L1 cache for similar vectors
        for cache_entry in self._l1_cache.values():
            if cache_entry.vector:
                similarity = self._cosine_similarity(vector, cache_entry.vector)
                if similarity >= threshold:
                    similar_results.append(cache_entry.result)

        # TODO: Implement L2 (Redis) vector search if needed
        # This would require Redis with vector search capabilities

        return similar_results

    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        if not vec1 or not vec2 or len(vec1) != len(vec2):
            return 0.0

        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = sum(a * a for a in vec1) ** 0.5
        magnitude2 = sum(b * b for b in vec2) ** 0.5

        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0

        return dot_product / (magnitude1 * magnitude2)

    async def clear(self):
        """Clear all cache entries (both L1 and L2)"""
        # Clear L1 cache
        self._l1_cache.clear()

        # Clear L2 cache (Redis)
        redis_client = await self._get_redis_client()
        if redis_client is not None:
            try:
                # Delete all keys with our prefix
                pattern = self.key_prefix + "*"
                keys = await redis_client.keys(pattern)
                if keys:
                    await redis_client.delete(*keys)
            except Exception as e:
                print(f"Redis cache clear error: {e}")

    def get_l1_stats(self) -> Dict[str, Any]:
        """Get L1 cache statistics"""
        return {
            "l1_size": len(self._l1_cache),
            "l1_capacity": self.l1_size,
            "l1_usage_percent": (len(self._l1_cache) / self.l1_size) * 100,
        }

    async def get_l2_stats(self) -> Dict[str, Any]:
        """Get L2 cache (Redis) statistics"""
        redis_client = await self._get_redis_client()
        if redis_client is None:
            return {"redis_available": False}

        try:
            pattern = self.key_prefix + "*"
            keys = await redis_client.keys(pattern)
            return {
                "redis_available": True,
                "l2_size": len(keys),
                "l2_prefix": self.key_prefix,
            }
        except Exception as e:
            return {"redis_available": False, "error": str(e)}
