from datetime import datetime, timezone

from app.utils import format_display_timestamp


def test_format_display_timestamp_utc_no_tz():
    creation_ts = "2025-10-01T12:00:00Z"
    now = datetime(2025, 10, 1, 13, 0, 0, tzinfo=timezone.utc)  # one hour later
    out = format_display_timestamp(creation_ts, None, now=now)
    assert out["tz_label"] == "UTC"
    assert out["is_future"] is False
    assert (
        out["relative_label"] == "1 hours ago"
        or out["relative_label"] == "60 minutes ago"
    )
    assert out["canonical_utc"].startswith("2025-10-01T12:00:00")


def test_format_display_timestamp_with_tz():
    creation_ts = "2025-10-01T12:00:00Z"
    now = datetime(2025, 10, 1, 13, 0, 0, tzinfo=timezone.utc)
    viewer_tz = "America/Los_Angeles"
    out = format_display_timestamp(creation_ts, viewer_tz, now=now)
    # If pytz is available, tz_label should match viewer_tz and
    # local_iso should reflect offset
    # The function may use pytz when available; accept either behavior.
    if out["tz_label"] == viewer_tz:
        assert out["local_iso"].startswith("2025-10-01T05:00:00")
    else:
        assert out["tz_label"] == "UTC"
        assert out["local_iso"].startswith("2025-10-01T12:00:00")


def test_format_display_timestamp_future_flag():
    creation_ts = "2025-10-02T12:00:00Z"
    now = datetime(2025, 10, 1, 12, 0, 0, tzinfo=timezone.utc)
    out = format_display_timestamp(creation_ts, None, now=now)
    assert out["is_future"] is True
    assert out["relative_label"] == "in the future"
