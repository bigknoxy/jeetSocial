from datetime import datetime, timedelta


def test_get_posts_view_top_orders_by_kindness(client):
    """Integration test: GET /api/posts?view=top should return posts ordered
    by kindness_points desc then timestamp desc
    """
    now = datetime.utcnow()
    # Create posts via the API (POST /api/posts)
    resp1 = client.post(
        "/api/posts",
        json={
            "content": "older low",
            "creation_timestamp": (now - timedelta(hours=2)).isoformat(),
        },
    )
    assert resp1.status_code == 201
    id1 = resp1.get_json()["id"]

    resp2 = client.post(
        "/api/posts",
        json={
            "content": "middle high",
            "creation_timestamp": (now - timedelta(hours=3)).isoformat(),
        },
    )
    assert resp2.status_code == 201
    id2 = resp2.get_json()["id"]

    resp3 = client.post(
        "/api/posts",
        json={
            "content": "newer low",
            "creation_timestamp": (now - timedelta(minutes=10)).isoformat(),
        },
    )
    assert resp3.status_code == 201
    id3 = resp3.get_json()["id"]

    # Manually award kindness points using DB manipulation since feature not
    # implemented
    from app import db
    from app.models import Post

    with client.application.app_context():
        p1 = db.session.get(Post, id1)
        p2 = db.session.get(Post, id2)
        p3 = db.session.get(Post, id3)
        # assign kindness points: p1=5, p2=10, p3=5 (p3 is newer than p1)
        p1.kindness_points = 5
        p2.kindness_points = 10
        p3.kindness_points = 5
        db.session.commit()

    # Now request top view
    resp = client.get("/api/posts?view=top")
    assert resp.status_code == 200
    posts = resp.get_json()
    # Expect order: id2, id3, id1
    assert [p["id"] for p in posts] == [id2, id3, id1]
