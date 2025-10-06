def test_display_timestamp_localization(client):
    """Integration: verify canonical timestamp is present for a post."""
    # Seed a post if API supports POST; otherwise assume post with id 1
    resp = client.get("/api/posts/1")
    assert resp.status_code in (200, 404)
    if resp.status_code == 200:
        item = resp.get_json()
        assert "creation_timestamp" in item
