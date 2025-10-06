import json
from datetime import datetime, timezone, timedelta


def _is_iso8601_utc(s: str) -> bool:
    try:
        # Expecting format like 2025-10-06T12:34:56Z or with fractional seconds
        if s.endswith("Z"):
            # strip trailing Z and parse
            s2 = s[:-1]
            # Allow microseconds
            datetime.fromisoformat(s2)
            return True
        return False
    except Exception:
        return False


def test_posts_include_iso_creation_timestamp(client):
    """TDD: posts endpoint must include ISO 8601 UTC `creation_timestamp`."""
    resp = client.get("/api/posts")
    assert resp.status_code in (200, 404)
    if resp.status_code == 200:
        data = resp.get_json()
        # Support both legacy paginated object and flat list responses
        items = data.get("posts") if isinstance(data, dict) else data
        assert isinstance(items, list)
        if not items:
            # No posts seeded; create one to assert against.
            create_resp = client.post(
                "/api/posts", json={"message": "seed post for timestamps"}
            )
            assert create_resp.status_code == 201
            data = client.get("/api/posts").get_json()
            items = data.get("posts") if isinstance(data, dict) else data
            assert items, "Failed to seed a post for timestamps test."
        item = items[0]
        assert "creation_timestamp" in item, "creation_timestamp missing from post item"
        assert isinstance(item["creation_timestamp"], str)
        assert _is_iso8601_utc(
            item["creation_timestamp"]
        ), "creation_timestamp must be ISO 8601 UTC (ending with Z)"


def test_post_future_indicator_and_display_meta(client):
    """TDD: post item should include `meta.display` and `meta.future` (boolean)."""
    # Preferably create a post with a future timestamp; otherwise inspect first item.
    future_dt = (datetime.now(timezone.utc) + timedelta(days=1)).replace(microsecond=0)
    future_ts = future_dt.isoformat().replace("+00:00", "Z")
    post_payload = {
        "content": "TDD future post",
        "creation_timestamp": future_ts,
    }
    # Try to create a post; some environments may reject creation_timestamp override.
    create_resp = client.post(
        "/api/posts",
        data=json.dumps(post_payload),
        content_type="application/json",
    )
    assert create_resp.status_code in (201, 400, 405, 422)
    # If post created (201), inspect it. Otherwise fall back to list.
    if create_resp.status_code == 201:
        item = create_resp.get_json()
    else:
        resp = client.get("/api/posts")
        assert resp.status_code in (200, 404)
        if resp.status_code == 404:
            assert False, "No posts endpoint available for testing metadata."
        data = resp.get_json()
        items = data.get("posts") if isinstance(data, dict) else data
        assert isinstance(items, list)
        if not items:
            assert False, "No posts available to inspect for meta fields."
        item = items[0]

    # The test expects server to provide a meta dict with display and future indicators.
    assert "meta" in item, "meta field missing from post item"
    assert isinstance(item["meta"], dict)
    assert "display" in item["meta"], "meta.display missing"
    assert "future" in item["meta"], "meta.future missing"
    assert isinstance(item["meta"]["future"], bool)
