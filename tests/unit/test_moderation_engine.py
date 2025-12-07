"""
Unit tests for the Intelligent Moderation Engine - Phase 1
Tests Layers 1-3: Rule-Based, Cache, Similarity
"""

import pytest
import time
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime

# Import the modules
from app.moderation import (
    IntelligentModerationEngine,
    ModerationLayer,
)
from app.moderation.cache import IntelligentCache
from app.moderation.vector_store import VectorStore
from app.moderation.metrics import MetricsCollector


class TestLayer1EvasionDetection:
    """Test Layer 1: Enhanced Rule-Based Filter with Evasion Detection"""

    @pytest.mark.asyncio
    async def test_basic_hate_speech_detection(self):
        """Test that basic hate speech is detected"""
        engine = IntelligentModerationEngine()

        # Test basic hateful words
        hate_cases = [
            "You are stupid",
            "I hate you",
            "Go away, idiot",
            "You're a moron",
        ]

        for text in hate_cases:
            result = await engine.moderate_content(text)
            assert result.is_hate is True
            assert result.layer == ModerationLayer.RULE_BASED
            assert result.confidence == 1.0

    @pytest.mark.asyncio
    async def test_evasion_detection_with_spaces(self):
        """Test evasion attempts with spaces between letters"""
        engine = IntelligentModerationEngine()

        evasion_cases = [
            "h a t e",
            "s t u p i d",
            "i d i o t",
            "m o r o n",
        ]

        for text in evasion_cases:
            result = await engine.moderate_content(text)
            assert result.is_hate is True
            assert result.layer == ModerationLayer.RULE_BASED
            assert "evasion" in result.reason.lower()

    @pytest.mark.asyncio
    async def test_evasion_detection_with_punctuation(self):
        """Test evasion attempts with punctuation between letters"""
        engine = IntelligentModerationEngine()

        evasion_cases = [
            "h.a.t.e",
            "s-t-u-p-i-d",
            "i.d.i.o.t",
            "m.o.r.o.n",
            "h@ate",
            "st@pid",
            "1d10t",  # leet speak
        ]

        for text in evasion_cases:
            result = await engine.moderate_content(text)
            assert result.is_hate is True
            assert result.layer == ModerationLayer.RULE_BASED

    @pytest.mark.asyncio
    async def test_evasion_detection_with_mixed_case(self):
        """Test evasion attempts with mixed case"""
        engine = IntelligentModerationEngine()

        evasion_cases = [
            "HaTe",
            "StUpId",
            "IdIoT",
            "MoRoN",
        ]

        for text in evasion_cases:
            result = await engine.moderate_content(text)
            assert result.is_hate is True
            assert result.layer == ModerationLayer.RULE_BASED

    @pytest.mark.asyncio
    async def test_clean_content_passes(self):
        """Test that clean content passes Layer 1"""
        engine = IntelligentModerationEngine()

        clean_cases = [
            "Have a great day!",
            "You are awesome",
            "I love this community",
            "Thank you for being kind",
            "You're doing great",
        ]

        for text in clean_cases:
            result = await engine.moderate_content(text)
            # Should not be flagged by Layer 1, may proceed to other layers
            if result.is_hate:
                assert result.layer != ModerationLayer.RULE_BASED


class TestLayer2Cache:
    """Test Layer 2: Exact Match Cache with L1 LRU + L2 Redis"""

    @pytest.mark.asyncio
    @patch("app.moderation.cache.redis")
    async def test_cache_miss_first_request(self, mock_redis):
        """Test that first request results in cache miss"""
        mock_redis.get = AsyncMock(return_value=None)
        mock_redis.setex = AsyncMock()

        cache = IntelligentCache()
        engine = IntelligentModerationEngine(cache=cache)

        text = "This is a test message"
        await engine.moderate_content(text)

        # Should call Redis get (cache miss)
        mock_redis.get.assert_called()
        # Should not call Redis set yet (result not cached until determined)

    @pytest.mark.asyncio
    @patch("app.moderation.cache.redis")
    async def test_cache_hit_second_request(self, mock_redis):
        """Test that second request hits cache"""
        cached_result = {
            "is_hate": False,
            "layer": "rule_based",
            "confidence": 0.0,
            "reason": "clean",
            "timestamp": datetime.utcnow().isoformat(),
        }
        mock_redis.get = AsyncMock(return_value=cached_result)

        cache = IntelligentCache()
        engine = IntelligentModerationEngine(cache=cache)

        text = "This is a test message"
        result = await engine.moderate_content(text)

        # Should return cached result
        assert result.is_hate is False
        mock_redis.get.assert_called()

    @pytest.mark.asyncio
    @patch("app.moderation.cache.redis")
    async def test_l1_cache_lru_eviction(self, mock_redis):
        """Test L1 cache LRU eviction"""
        mock_redis.get = AsyncMock(return_value=None)
        mock_redis.setex = AsyncMock()

        cache = IntelligentCache(l1_size=2)  # Small cache for testing
        engine = IntelligentModerationEngine(cache=cache)

        # Fill cache beyond capacity
        texts = ["message1", "message2", "message3"]
        for text in texts:
            await engine.moderate_content(text)

        # First message should be evicted from L1
        # This test will need to check internal L1 cache state
        # Implementation detail to be verified during implementation

    @pytest.mark.asyncio
    async def test_cache_key_generation(self):
        """Test that cache keys are properly generated"""
        cache = IntelligentCache()

        text1 = "Hello world"
        text2 = "Hello world"  # Same content
        text3 = "Hello World"  # Different case

        key1 = cache._generate_cache_key(text1)
        key2 = cache._generate_cache_key(text2)
        key3 = cache._generate_cache_key(text3)

        # Same content should generate same key
        assert key1 == key2
        # Different case should generate different key (case-sensitive)
        assert key1 != key3


class TestLayer3Similarity:
    """Test Layer 3: Similarity Detection with TF-IDF and Cosine Similarity"""

    def test_vector_store_initialization(self):
        """Test that VectorStore initializes with seed hate speech vectors"""
        vector_store = VectorStore()

        # Should have seed vectors loaded
        assert len(vector_store.hate_vectors) > 0
        assert vector_store.vectorizer is not None

    def test_cosine_similarity_calculation(self):
        """Test cosine similarity calculation"""
        vector_store = VectorStore()

        # Test identical vectors
        vec1 = [1.0, 0.0, 0.0]
        vec2 = [1.0, 0.0, 0.0]
        similarity = vector_store._cosine_similarity(vec1, vec2)
        assert abs(similarity - 1.0) < 1e-6

        # Test orthogonal vectors
        vec3 = [1.0, 0.0, 0.0]
        vec4 = [0.0, 1.0, 0.0]
        similarity = vector_store._cosine_similarity(vec3, vec4)
        assert abs(similarity - 0.0) < 1e-6

    @pytest.mark.asyncio
    async def test_similarity_detection_high_threshold(self):
        """Test similarity detection with high similarity threshold"""
        engine = IntelligentModerationEngine()

        # Test content similar to known hate speech
        similar_hate_cases = [
            "You are really stupid",
            "I hate everyone here",
            "Go away you idiot",
        ]

        for text in similar_hate_cases:
            result = await engine.moderate_content(text)
            # Should be detected by similarity layer if not caught by Layer 1
            if result.is_hate and result.layer == ModerationLayer.SIMILARITY:
                assert result.confidence >= 0.85  # Default threshold

    @pytest.mark.asyncio
    async def test_similarity_below_threshold(self):
        """Test that content below similarity threshold passes"""
        engine = IntelligentModerationEngine()

        # Test content with low similarity to hate speech
        low_similarity_cases = [
            "You are smart",
            "I love everyone here",
            "Welcome friend",
        ]

        for text in low_similarity_cases:
            result = await engine.moderate_content(text)
            # Should not be flagged by similarity layer
            if result.layer == ModerationLayer.SIMILARITY:
                assert result.confidence < 0.85


class TestEngineOrchestration:
    """Test Engine Orchestration and Fallback Chain"""

    @pytest.mark.asyncio
    async def test_fallback_chain_layer1_to_layer2(self):
        """Test fallback from Layer 1 to Layer 2"""
        cache = Mock(spec=IntelligentCache)
        cache.get = AsyncMock(return_value=None)  # Cache miss
        cache.set = AsyncMock()

        engine = IntelligentModerationEngine(cache=cache)

        text = "You are stupid"  # Should be caught by Layer 1
        result = await engine.moderate_content(text)

        assert result.is_hate is True
        assert result.layer == ModerationLayer.RULE_BASED
        # Should not proceed to Layer 2 if Layer 1 catches it

    @pytest.mark.asyncio
    async def test_fallback_chain_layer2_to_layer3(self):
        """Test fallback from Layer 2 to Layer 3"""
        cache = Mock(spec=IntelligentCache)
        cache.get = AsyncMock(return_value=None)  # Cache miss
        cache.set = AsyncMock()

        vector_store = Mock(spec=VectorStore)
        vector_store.is_similar_to_hate = AsyncMock(return_value=False)

        engine = IntelligentModerationEngine(cache=cache, vector_store=vector_store)

        text = "You are awesome"  # Clean content
        result = await engine.moderate_content(text)

        # Should proceed through all layers for clean content
        assert result.is_hate is False

    @pytest.mark.asyncio
    async def test_layer4_budget_exceeded_placeholder(self):
        """Test Layer 4 budget exceeded placeholder (Phase 1)"""
        engine = IntelligentModerationEngine()

        text = "Some clean content"  # Should reach Layer 4
        result = await engine.moderate_content(text)

        # In Phase 1, Layer 4 should return safe with budget_exceeded layer
        if result.layer == ModerationLayer.BUDGET_EXCEEDED:
            assert result.is_hate is False
            assert "budget" in result.reason.lower()

    @pytest.mark.asyncio
    async def test_processing_time_tracking(self):
        """Test that processing time is tracked"""
        engine = IntelligentModerationEngine()

        text = "Test message"
        start_time = time.time()
        result = await engine.moderate_content(text)
        end_time = time.time()

        # Processing time should be reasonable (< 50ms for cache hits)
        assert result.processing_time_ms >= 0
        assert (
            result.processing_time_ms < (end_time - start_time) * 1000 + 10
        )  # Allow some tolerance


class TestMetricsCollection:
    """Test Metrics Collection and Buffering"""

    @pytest.mark.asyncio
    @patch("app.moderation.metrics.redis")
    async def test_metrics_buffering(self, mock_redis):
        """Test that metrics are buffered and flushed to Redis"""
        mock_redis.rpush = AsyncMock()
        mock_redis.hincrby = AsyncMock()

        metrics = MetricsCollector()

        # Record some metrics
        await metrics.record_moderation_event(ModerationLayer.RULE_BASED, True, 5.0)
        await metrics.record_moderation_event(ModerationLayer.CACHE_HIT, False, 2.0)

        # Should buffer locally
        assert len(metrics.buffer) == 2

        # Flush to Redis
        await metrics.flush()

        # Should call Redis operations
        assert mock_redis.rpush.called or mock_redis.hincrby.called

    @pytest.mark.asyncio
    async def test_aggregated_stats(self):
        """Test that aggregated stats are calculated correctly"""
        metrics = MetricsCollector()

        # Record some events
        await metrics.record_moderation_event(ModerationLayer.RULE_BASED, True, 5.0)
        await metrics.record_moderation_event(ModerationLayer.RULE_BASED, True, 3.0)
        await metrics.record_moderation_event(ModerationLayer.CACHE_HIT, False, 1.0)

        stats = metrics.get_aggregated_stats()

        assert stats["total_requests"] == 3
        assert stats["rule_based_count"] == 2
        assert stats["cache_hit_count"] == 1
        assert stats["hate_detected_count"] == 2
        assert stats["avg_processing_time_ms"] == 3.0  # (5+3+1)/3


class TestPrivacyCompliance:
    """Test Privacy and GDPR Compliance"""

    @pytest.mark.asyncio
    async def test_content_hashing_no_plaintext_storage(self):
        """Test that content is hashed, not stored in plaintext"""
        cache = Mock(spec=IntelligentCache)
        cache.get = AsyncMock(return_value=None)
        cache.set = AsyncMock()

        engine = IntelligentModerationEngine(cache=cache)

        text = "This is personal content"
        await engine.moderate_content(text)

        # Check that cache.set was called with hash, not plaintext
        cache.set.assert_called()
        call_args = cache.set.call_args
        cache_key = call_args[0][0]  # First argument should be the cache key

        # Cache key should be a hash, not the original text
        assert cache_key != text
        assert len(cache_key) == 64  # SHA-256 hex length

    @pytest.mark.asyncio
    async def test_no_pii_in_metrics(self):
        """Test that no personally identifiable information is in metrics"""
        metrics = MetricsCollector()

        # Record event with potentially sensitive content
        await metrics.record_moderation_event(
            ModerationLayer.RULE_BASED, True, 5.0, content="user@example.com is stupid"
        )

        # Check that PII is not stored in metrics
        metric_data = metrics.buffer[-1]  # Get last recorded metric
        assert "user@example.com" not in str(metric_data)
        assert "stupid" not in str(metric_data)  # Content should be hashed

    @pytest.mark.asyncio
    async def test_ttl_configuration(self):
        """Test that TTL is properly configured for GDPR compliance"""
        cache = Mock(spec=IntelligentCache)
        cache.get = AsyncMock(return_value=None)
        cache.set = AsyncMock()

        engine = IntelligentModerationEngine(cache=cache)

        text = "Test content"
        await engine.moderate_content(text)

        # Check that cache.set was called with appropriate TTL
        cache.set.assert_called()
        call_args = cache.set.call_args
        ttl = call_args[1].get("ttl", call_args[1].get("ex"))  # TTL parameter

        # TTL should be 90 days or less for GDPR compliance
        assert ttl <= 90 * 24 * 3600  # 90 days in seconds
