"""
Data models for the Intelligent Moderation Engine
Defines core data structures for moderation results and layers
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, Optional, List, Any
from datetime import datetime


class ModerationLayer(Enum):
    """Enumeration of moderation layers in the defense architecture"""

    RULE_BASED = "rule_based"
    CACHE_HIT = "cache_hit"
    SIMILARITY = "similarity"
    AI_API = "ai_api"
    BUDGET_EXCEEDED = "budget_exceeded"
    MANUAL_REVIEW = "manual_review"


@dataclass
class ModerationResult:
    """Result of moderation analysis with metadata"""

    is_hate: bool
    layer: ModerationLayer
    confidence: float
    reason: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    processing_time_ms: int = 0
    neurons_used: int = 0
    timestamp: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "is_hate": self.is_hate,
            "layer": self.layer.value,
            "confidence": self.confidence,
            "reason": self.reason,
            "metadata": self.metadata,
            "processing_time_ms": self.processing_time_ms,
            "neurons_used": self.neurons_used,
            "timestamp": self.timestamp.isoformat(),
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ModerationResult":
        """Create from dictionary for deserialization"""
        return cls(
            is_hate=data["is_hate"],
            layer=ModerationLayer(data["layer"]),
            confidence=data["confidence"],
            reason=data["reason"],
            metadata=data.get("metadata", {}),
            processing_time_ms=data.get("processing_time_ms", 0),
            neurons_used=data.get("neurons_used", 0),
            timestamp=(
                datetime.fromisoformat(data["timestamp"])
                if "timestamp" in data
                else datetime.utcnow()
            ),
        )


@dataclass
class CacheEntry:
    """Cache entry with metadata"""

    result: ModerationResult
    access_count: int = 1
    last_accessed: datetime = field(default_factory=datetime.utcnow)
    vector: Optional[List[float]] = None  # For similarity caching

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "result": self.result.to_dict(),
            "access_count": self.access_count,
            "last_accessed": self.last_accessed.isoformat(),
            "vector": self.vector,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CacheEntry":
        """Create from dictionary for deserialization"""
        return cls(
            result=ModerationResult.from_dict(data["result"]),
            access_count=data.get("access_count", 1),
            last_accessed=(
                datetime.fromisoformat(data["last_accessed"])
                if "last_accessed" in data
                else datetime.utcnow()
            ),
            vector=data.get("vector"),
        )


@dataclass
class MetricEvent:
    """Single metric event for tracking"""

    layer: ModerationLayer
    is_hate: bool
    processing_time_ms: float
    timestamp: datetime = field(default_factory=datetime.utcnow)
    content_hash: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "layer": self.layer.value,
            "is_hate": self.is_hate,
            "processing_time_ms": self.processing_time_ms,
            "timestamp": self.timestamp.isoformat(),
            "content_hash": self.content_hash,
        }
