from datetime import datetime, timedelta


def test_real_time_top_updates_reflect_kindness_changes(client):
    """Integration test: simulate kindness updates and assert ordering."""
    now = datetime.utcnow()
    # Create posts via the API
    resp1 = client.post(
        "/api/posts",
        json={
            "content": "post1",
            "creation_timestamp": (now - timedelta(hours=2)).isoformat(),
        },
    )
    assert resp1.status_code == 201
    id1 = resp1.get_json()["id"]

    resp2 = client.post(
        "/api/posts",
        json={
            "content": "post2",
            "creation_timestamp": (now - timedelta(hours=1)).isoformat(),
        },
    )
    assert resp2.status_code == 201
    id2 = resp2.get_json()["id"]

    # Initially, both have 0 kindness_points, so order by timestamp desc: id2, id1
    resp = client.get("/api/posts?view=top")
    assert resp.status_code == 200
    posts = resp.get_json()
    assert [p["id"] for p in posts[:2]] == [id2, id1]

    # Simulate kindness point update for id1 (e.g., via redeem endpoint)
    # Since redeem requires token, we'll update DB directly for test
    from app import db
    from app.models import Post

    with client.application.app_context():
        p1 = db.session.get(Post, id1)
        p1.kindness_points = 5
        db.session.commit()

    # Now, top view should have id1 first (higher points, older but points win)
    resp = client.get("/api/posts?view=top")
    assert resp.status_code == 200
    posts = resp.get_json()
    assert posts[0]["id"] == id1
    assert posts[1]["id"] == id2
