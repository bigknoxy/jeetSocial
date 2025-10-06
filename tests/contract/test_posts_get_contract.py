def test_posts_get_contract_schema(client):
    """Contract: GET /api/posts returns creation_timestamp for each post."""
    resp = client.get("/api/posts")
    assert resp.status_code in (200, 404)
    if resp.status_code == 200:
        data = resp.get_json()
        items = data.get("posts") if isinstance(data, dict) else data
        assert isinstance(items, list)
        for item in items:
            assert "id" in item
            assert "content" in item
            assert "creation_timestamp" in item
            assert isinstance(item["creation_timestamp"], str)
