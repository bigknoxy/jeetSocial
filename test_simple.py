#!/usr/bin/env python3
"""Simple test to verify moderation engine works"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import asyncio
from app.moderation import IntelligentModerationEngine


async def test_basic():
    """Test basic functionality"""
    engine = IntelligentModerationEngine()

    # Test hate speech
    result = await engine.moderate_content("You are stupid")
    assert result.is_hate == True
    assert result.layer.value == "rule_based"

    # Test clean content
    result = await engine.moderate_content("Have a great day")
    assert result.is_hate == False

    print("✅ All basic tests passed!")


if __name__ == "__main__":
    asyncio.run(test_basic())
