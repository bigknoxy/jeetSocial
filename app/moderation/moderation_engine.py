"""
Intelligent Moderation Engine - Phase 1
Four-layer defense architecture: Rule-Based, Cache, Similarity, AI (placeholder)
"""

import os
import time
import hashlib
from typing import Optional, Dict, Any
import re

from .data_models import ModerationResult, ModerationLayer
from .cache import IntelligentCache
from .vector_store import VectorStore
from .metrics import MetricsCollector

# Import existing moderation logic for Layer 1
from ..utils import _legacy_hate_speech_check as legacy_is_hate_speech, normalize_text


class IntelligentModerationEngine:
    """Four-layer intelligent moderation engine"""

    def __init__(
        self,
        cache: Optional[IntelligentCache] = None,
        vector_store: Optional[VectorStore] = None,
        metrics: Optional[MetricsCollector] = None,
        similarity_threshold: float = 0.85,
    ):
        """
        Initialize moderation engine

        Args:
            cache: Cache instance (L1 + L2)
            vector_store: Vector store for similarity detection
            metrics: Metrics collector
            similarity_threshold: Threshold for similarity matching
        """
        self.cache = cache or IntelligentCache()
        self.vector_store = vector_store or VectorStore(
            similarity_threshold=similarity_threshold
        )
        self.metrics = metrics

        # Feature flags
        self.enable_ai_moderation = os.getenv("ENABLE_AI_MODERATION", "0") == "1"
        self.enable_similarity_remote = (
            os.getenv("ENABLE_SIMILARITY_REMOTE", "0") == "1"
        )
        self.enable_moderation = os.getenv("ENABLE_MODERATION", "1") == "1"

        # Daily AI budget tracking (simulated for Phase 1)
        self.daily_ai_budget = 1000  # Simulated daily budget
        self.ai_usage_today = 0

    async def moderate_content(self, content: str) -> ModerationResult:
        """
        Moderate content using four-layer defense architecture

        Args:
            content: Content to moderate

        Returns:
            ModerationResult with decision and metadata
        """
        start_time = time.time()
        content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()

        try:
            # Check if moderation is enabled
            if not self.enable_moderation:
                result = ModerationResult(
                    is_hate=False,
                    layer=ModerationLayer.RULE_BASED,
                    confidence=0.0,
                    reason="moderation_disabled",
                )
                await self._record_metrics(result, start_time, content_hash)
                return result

            # Layer 1: Rule-Based Filter (with evasion detection)
            result = await self._layer1_rule_based(content)
            if result.is_hate:
                await self._cache_result_and_record_metrics(
                    content, result, start_time, content_hash
                )
                return result

            # Layer 2: Exact Match Cache
            cached_result = await self.cache.get(content)
            if cached_result is not None:
                # Update cached result with cache hit layer
                cached_result.layer = ModerationLayer.CACHE_HIT
                cached_result.processing_time_ms = int(
                    (time.time() - start_time) * 1000
                )
                await self._record_metrics(cached_result, start_time, content_hash)
                return cached_result

            # Layer 3: Similarity Detection
            result = await self._layer3_similarity(content)
            if result.is_hate:
                await self._cache_result_and_record_metrics(
                    content, result, start_time, content_hash
                )
                return result

            # Layer 4: AI API (placeholder for Phase 1)
            result = await self._layer4_ai_placeholder(content)

            # Cache final result
            await self._cache_result_and_record_metrics(
                content, result, start_time, content_hash
            )
            return result

        except Exception as e:
            # Fallback to legacy moderation on error
            try:
                is_hate, reason, details = legacy_is_hate_speech(content)
                result = ModerationResult(
                    is_hate=is_hate,
                    layer=ModerationLayer.RULE_BASED,
                    confidence=1.0 if is_hate else 0.0,
                    reason=(
                        f"fallback_legacy: {reason}" if reason else "fallback_legacy"
                    ),
                    metadata={"error": str(e), "legacy_details": details},
                )
                result.processing_time_ms = int((time.time() - start_time) * 1000)
                await self._record_metrics(result, start_time, content_hash)
                return result
            except Exception as fallback_error:
                # Ultimate fallback
                result = ModerationResult(
                    is_hate=False,
                    layer=ModerationLayer.RULE_BASED,
                    confidence=0.0,
                    reason="ultimate_fallback_error",
                    metadata={"error": str(e), "fallback_error": str(fallback_error)},
                )
                result.processing_time_ms = int((time.time() - start_time) * 1000)
                await self._record_metrics(result, start_time, content_hash)
                return result

    async def _layer1_rule_based(self, content: str) -> ModerationResult:
        """
        Layer 1: Enhanced Rule-Based Filter with Evasion Detection
        """
        # Use existing moderation logic with enhanced evasion detection
        is_hate, reason, details = legacy_is_hate_speech(content)

        if is_hate:
            return ModerationResult(
                is_hate=True,
                layer=ModerationLayer.RULE_BASED,
                confidence=1.0,
                reason=f"rule_based: {reason}" if reason else "rule_based: detected",
                metadata={"legacy_reason": reason, "legacy_details": details},
            )

        # Enhanced evasion detection
        evasion_detected = self._detect_evasion_attempts(content)
        if evasion_detected:
            return ModerationResult(
                is_hate=True,
                layer=ModerationLayer.RULE_BASED,
                confidence=1.0,
                reason=f"evasion_detected: {evasion_detected}",
                metadata={"evasion_type": evasion_detected},
            )

        return ModerationResult(
            is_hate=False,
            layer=ModerationLayer.RULE_BASED,
            confidence=0.0,
            reason="rule_based: clean",
        )

    def _detect_evasion_attempts(self, content: str) -> Optional[str]:
        """
        Detect common evasion attempts

        Args:
            content: Content to analyze

        Returns:
            Evasion type if detected, None otherwise
        """
        normalized = normalize_text(content)

        # Check for spaced-out words (h a t e)
        if re.search(r"\b\w+\s+\w+\s+\w+\s+\w+\b", normalized):
            # Check if spaced letters form hateful words
            words = normalized.split()
            for i in range(len(words) - 3):
                combined = "".join(words[i:i + 4])
                if combined.lower() in ["hate", "stupid", "idiot", "moron"]:
                    return "spaced_letters"

        # Check for punctuation-separated letters (h.a.t.e)
        if re.search(r"\b\w+[.\-_]\w+[.\-_]\w+[.\-_]\w+\b", content.lower()):
            # Remove punctuation and check
            cleaned = re.sub(r"[.\-_]", "", content.lower())
            if cleaned in ["hate", "stupid", "idiot", "moron"]:
                return "punctuation_separation"

        # Check for excessive repetition (ssstttuuupppiiiddd)
        if re.search(r"(.)\1{2,}", content.lower()):
            # Normalize repeated letters and check
            normalized_repeated = re.sub(r"(.)\1+", r"\1", content.lower())
            if normalized_repeated in ["hate", "stupid", "idiot", "moron"]:
                return "excessive_repetition"

        # Check for leet speak patterns
        leet_patterns = {
            r"h[4@]t[3e]": "hate",
            r"s[t7][u@]p[1i][d]": "stupid",
            r"[1i][d@][1i][o0][t7]": "idiot",
            r"m[0o][r@][o0]n": "moron",
        }

        for pattern, word in leet_patterns.items():
            if re.search(pattern, content.lower()):
                return f"leet_speak_{word}"

        return None

    async def _layer3_similarity(self, content: str) -> ModerationResult:
        """
        Layer 3: Similarity Detection using TF-IDF and Cosine Similarity
        """
        is_hate, similarity, reason = self.vector_store.is_similar_to_hate(content)

        return ModerationResult(
            is_hate=is_hate,
            layer=ModerationLayer.SIMILARITY,
            confidence=similarity,
            reason=reason,
            metadata={"similarity_score": similarity},
        )

    async def _layer4_ai_placeholder(self, content: str) -> ModerationResult:
        """
        Layer 4: AI API (Placeholder for Phase 1)
        In Phase 1, this simulates budget checking and returns conservative fallback
        """
        # Check daily budget (simulated)
        if self.ai_usage_today >= self.daily_ai_budget:
            return ModerationResult(
                is_hate=False,
                layer=ModerationLayer.BUDGET_EXCEEDED,
                confidence=0.0,
                reason="ai_budget_exceeded_conservative_fallback",
                metadata={
                    "budget_used": self.ai_usage_today,
                    "daily_budget": self.daily_ai_budget,
                },
            )

        # Simulate AI call (placeholder)
        if self.enable_ai_moderation:
            # In Phase 1, we don't actually call AI
            # Just increment usage and return safe
            self.ai_usage_today += 1
            return ModerationResult(
                is_hate=False,
                layer=ModerationLayer.AI_API,
                confidence=0.0,
                reason="ai_placeholder_phase1",
                metadata={"ai_usage": self.ai_usage_today},
            )
        else:
            return ModerationResult(
                is_hate=False,
                layer=ModerationLayer.BUDGET_EXCEEDED,
                confidence=0.0,
                reason="ai_moderation_disabled",
                metadata={"feature_disabled": True},
            )

    async def _cache_result_and_record_metrics(
        self,
        content: str,
        result: ModerationResult,
        start_time: float,
        content_hash: str,
    ):
        """Cache result and record metrics"""
        # Get vector for caching if similarity layer was used
        vector = None
        if result.layer == ModerationLayer.SIMILARITY:
            vector = self.vector_store.get_vector(content)

        # Cache the result
        await self.cache.set(content, result, vector)

        # Record metrics
        await self._record_metrics(result, start_time, content_hash)

    async def _record_metrics(
        self, result: ModerationResult, start_time: float, content_hash: str
    ):
        """Record metrics for the moderation event"""
        if self.metrics:
            processing_time_ms = (time.time() - start_time) * 1000
            await self.metrics.record_moderation_event(
                layer=result.layer,
                is_hate=result.is_hate,
                processing_time_ms=processing_time_ms,
                content_hash=content_hash,
            )

    async def get_stats(self) -> Dict[str, Any]:
        """Get comprehensive engine statistics"""
        stats = {
            "engine_config": {
                "enable_ai_moderation": self.enable_ai_moderation,
                "enable_similarity_remote": self.enable_similarity_remote,
                "enable_moderation": self.enable_moderation,
                "daily_ai_budget": self.daily_ai_budget,
                "ai_usage_today": self.ai_usage_today,
            }
        }

        # Add cache stats
        cache_stats = self.cache.get_l1_stats()
        l2_stats = await self.cache.get_l2_stats()
        stats["cache"] = {**cache_stats, **l2_stats}

        # Add vector store stats
        stats["vector_store"] = self.vector_store.get_stats()

        # Add metrics stats
        if self.metrics:
            stats["metrics"] = self.metrics.get_aggregated_stats()
            redis_stats = await self.metrics.get_redis_stats()
            stats["metrics"].update(redis_stats)

        return stats

    async def reset_daily_budget(self):
        """Reset daily AI budget usage"""
        self.ai_usage_today = 0

    def update_similarity_threshold(self, new_threshold: float):
        """Update similarity threshold"""
        self.vector_store.update_threshold(new_threshold)
