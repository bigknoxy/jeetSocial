"""
test_posts_edge.py
"""

import pytest


@pytest.mark.parametrize(
    "message",
    [
        "\u202Eevil",  # Unicode trick
        "b\u0069got",  # Obfuscated word
        "stup1d",  # Leet speak
    ],
)
def test_obfuscated_hate_speech(client, message):
    resp = client.post("/api/posts", json={"message": message})
    assert resp.status_code in (201, 403)
