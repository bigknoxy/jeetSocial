#!/usr/bin/env python3
"""
Simple test to verify moderation engine basic functionality
"""

import sys
import os

sys.path.append("/app")


def test_basic_imports():
    """Test that we can import the moderation modules"""
    try:
        from app.moderation.data_models import ModerationResult, ModerationLayer

        print("✅ Data models imported successfully")
        return True
    except ImportError as e:
        print(f"❌ Failed to import data models: {e}")
        return False


def test_basic_moderation():
    """Test basic moderation functionality without external dependencies"""
    try:
        from app.utils import is_hate_speech

        # Test basic hate speech detection
        test_cases = [
            ("I love everyone", False),
            ("You are terrible", False),  # Not in our filter list
            ("This is wonderful", False),
        ]

        for text, expected in test_cases:
            result = is_hate_speech(text)
            # New engine returns tuple: (is_flagged, layer, confidence)
            if isinstance(result, tuple):
                is_flagged = result[0]
            else:
                is_flagged = result

            print(f"Text: '{text}' -> Moderated: {is_flagged} (expected: {expected})")
            if is_flagged != expected:
                print(f"❌ Unexpected result for: {text}")
                return False

        print("✅ Basic moderation functionality working")
        return True
    except Exception as e:
        print(f"❌ Error in basic moderation: {e}")
        return False


def test_redis_connection():
    """Test if Redis is available"""
    try:
        import redis

        # Web service uses host network mode, so Redis is on localhost
        r = redis.Redis(host="localhost", port=6379, decode_responses=True)
        r.ping()
        print("✅ Redis connection successful")
        return True
    except Exception as e:
        print(f"⚠️  Redis connection failed: {e}")
        return False


if __name__ == "__main__":
    print("=== jeetSocial Moderation Engine Test ===")

    success = True
    success &= test_basic_imports()
    success &= test_basic_moderation()
    success &= test_redis_connection()

    if success:
        print("\n🎉 All basic tests passed!")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed")
        sys.exit(1)
