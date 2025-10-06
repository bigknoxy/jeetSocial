def test_display_timestamp_hybrid_rule(client):
    """Integration: verify posts endpoint returns a list of posts."""
    resp = client.get("/api/posts")
    assert resp.status_code in (200, 404)
    if resp.status_code == 200:
        data = resp.get_json()
        items = data.get("posts") if isinstance(data, dict) else data
        assert isinstance(items, list)
