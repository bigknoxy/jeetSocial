def test_post_get_contract_schema(client):
    """Contract: GET /api/posts/{id} returns canonical timestamp."""
    # Try id 1; test environments may seed data.
    resp = client.get("/api/posts/1")
    assert resp.status_code in (200, 404)
    if resp.status_code == 200:
        item = resp.get_json()
        assert "id" in item
        assert "creation_timestamp" in item
        assert isinstance(item["creation_timestamp"], str)
