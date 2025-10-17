from datetime import datetime, timedelta


def test_get_posts_view_top_filters_within_24_hours(client):
    """Integration test: GET /api/posts?view=top should only
    return posts from last 24 hours.
    """
    now = datetime.utcnow()
    # Create posts
    resp1 = client.post("/api/posts", json={"content": "recent post"})
    assert resp1.status_code == 201
    id1 = resp1.get_json()["id"]

    resp2 = client.post("/api/posts", json={"content": "old post"})
    assert resp2.status_code == 201
    id2 = resp2.get_json()["id"]

    # Modify timestamps directly in DB
    from app import db
    from app.models import Post

    with client.application.app_context():
        p1 = db.session.get(Post, id1)
        p2 = db.session.get(Post, id2)
        assert p1 is not None
        assert p2 is not None
        p1.timestamp = now - timedelta(hours=12)  # Recent
        p2.timestamp = now - timedelta(hours=48)  # Old
        p1.kindness_points = 10
        p2.kindness_points = 20
        db.session.commit()
        db.session.refresh(p1)
        db.session.refresh(p2)

    # Request top view
    resp = client.get("/api/posts?view=top")
    assert resp.status_code == 200
    body = resp.get_json()
    if isinstance(body, dict):
        posts = body.get("posts")
        if posts is None:
            posts = body.get("items") or body.get("data") or []
    elif isinstance(body, list):
        posts = body
    else:
        posts = []

    # Should only include the recent post
    assert len(posts) == 1
    assert posts[0]["id"] == id1


def test_get_posts_view_top_orders_by_kindness_points_desc_then_timestamp_desc(client):
    """Integration test: GET /api/posts?view=top should order posts by
    kindness_points desc, then timestamp desc.
    """
    now = datetime.utcnow()
    # Create posts
    resp1 = client.post("/api/posts", json={"content": "post1"})
    assert resp1.status_code == 201
    id1 = resp1.get_json()["id"]

    resp2 = client.post("/api/posts", json={"content": "post2"})
    assert resp2.status_code == 201
    id2 = resp2.get_json()["id"]

    resp3 = client.post("/api/posts", json={"content": "post3"})
    assert resp3.status_code == 201
    id3 = resp3.get_json()["id"]

    # Modify timestamps and set kindness points
    from app import db
    from app.models import Post

    with client.application.app_context():
        p1 = db.session.get(Post, id1)
        p2 = db.session.get(Post, id2)
        p3 = db.session.get(Post, id3)
        assert p1 is not None
        assert p2 is not None
        assert p3 is not None
        p1.timestamp = now - timedelta(hours=1)  # Newer
        p2.timestamp = now - timedelta(hours=2)
        p3.timestamp = now - timedelta(hours=3)  # Older
        p1.kindness_points = 15
        p2.kindness_points = 20
        p3.kindness_points = 15
        db.session.commit()

    # Request top view
    resp = client.get("/api/posts?view=top")
    assert resp.status_code == 200
    body = resp.get_json()
    if isinstance(body, dict):
        posts = body.get("posts")
        if posts is None:
            posts = body.get("items") or body.get("data") or []
    elif isinstance(body, list):
        posts = body
    else:
        posts = []

    # Expected order: id2 (20 points), id1 (15 points, newer), id3 (15 points, older)
    assert [p["id"] for p in posts] == [id2, id1, id3]


def test_get_posts_view_top_respects_limit(client):
    """Integration test: GET /api/posts?view=top should respect the
    `limit` parameter.
    """
    now = datetime.utcnow()
    # Create 5 posts
    ids = []
    for i in range(5):
        resp = client.post("/api/posts", json={"content": f"post{i}"})
        assert resp.status_code == 201
        ids.append(resp.get_json()["id"])

    # Modify timestamps and set kindness points in descending order
    from app import db
    from app.models import Post

    with client.application.app_context():
        for i, post_id in enumerate(ids):
            p = db.session.get(Post, post_id)
            assert p is not None
            p.timestamp = now - timedelta(hours=i)
            p.kindness_points = 10 - i
        db.session.commit()

    # Request top view with limit=3
    resp = client.get("/api/posts?view=top&limit=3")
    assert resp.status_code == 200
    body = resp.get_json()
    if isinstance(body, dict):
        posts = body.get("posts")
        if posts is None:
            posts = body.get("items") or body.get("data") or []
    elif isinstance(body, list):
        posts = body
    else:
        posts = []

    # Should return only 3 posts, ordered by kindness_points desc
    assert len(posts) == 3
    assert [p["id"] for p in posts] == [ids[0], ids[1], ids[2]]


def test_get_posts_view_top_empty_when_no_posts_in_window(client):
    """Integration test: GET /api/posts?view=top should return an empty list
    if no posts exist in the last 24 hours.
    """
    now = datetime.utcnow()
    # Create a post
    resp = client.post("/api/posts", json={"content": "old post"})
    assert resp.status_code == 201
    post_id = resp.get_json()["id"]

    # Modify timestamp to be outside 24 hours
    from app import db
    from app.models import Post

    with client.application.app_context():
        p = db.session.get(Post, post_id)
        assert p is not None
        p.timestamp = now - timedelta(hours=48)
        db.session.commit()

    # Request top view
    resp = client.get("/api/posts?view=top")
    assert resp.status_code == 200
    body = resp.get_json()
    if isinstance(body, dict):
        posts = body.get("posts")
        if posts is None:
            posts = body.get("items") or body.get("data") or []
    elif isinstance(body, list):
        posts = body
    else:
        posts = []

    # Should be empty
    assert posts == []
