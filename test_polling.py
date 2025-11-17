#!/usr/bin/env python3
"""
Simple test script to verify polling functionality
"""

import requests
import time
import json


import pytest


@pytest.mark.skip(reason="Integration test requires server running on localhost:5678")
def test_polling():
    base_url = "http://localhost:5678"

    # Get initial posts
    print("Getting initial posts...")
    response = requests.get(f"{base_url}/api/posts?page=1&limit=5")
    initial_posts = response.json()
    initial_count = len(initial_posts["posts"])
    print(f"Initial post count: {initial_count}")

    # Create a new post
    print("Creating new post...")
    new_post_content = f"Test polling post {int(time.time())}"
    response = requests.post(
        f"{base_url}/api/posts",
        json={"content": new_post_content},
        headers={"Content-Type": "application/json"},
    )
    new_post = response.json()
    print(f"Created post: {new_post['id']} - {new_post_content}")

    # Wait a moment and check if post appears in feed
    print("Waiting 2 seconds...")
    time.sleep(2)

    # Check posts again
    print("Checking for new post...")
    response = requests.get(f"{base_url}/api/posts?page=1&limit=5")
    updated_posts = response.json()
    updated_count = len(updated_posts["posts"])
    print(f"Updated post count: {updated_count}")

    # Check if new post is in the list
    new_post_found = any(
        post["id"] == new_post["id"] for post in updated_posts["posts"]
    )
    print(f"New post found in feed: {new_post_found}")

    if new_post_found:
        print("✅ Polling test PASSED - new post appears in feed")
    else:
        print("❌ Polling test FAILED - new post not found in feed")
        print("Posts in feed:")
        for post in updated_posts["posts"]:
            print(f"  ID: {post['id']} - {post['message'][:50]}...")


if __name__ == "__main__":
    test_polling()
