from datetime import datetime, timedelta, timezone

from belfort.sentiment.aggregate import build_response
from belfort.sentiment.models import Mention


def test_build_response_empty():
    resp = build_response("BTC", [], "24h")
    assert resp.symbol == "BTC"
    assert resp.score == 0.0
    assert resp.tone == "neutral"
    assert resp.mentions_24h == 0


def test_build_response_with_mentions():
    now = datetime.now(timezone.utc)
    mentions = [
        Mention(
            text="Bitcoin is pumping hard, incredible bullish momentum everywhere",
            created_at=now - timedelta(hours=2),
            source="reddit",
        ),
        Mention(
            text="BTC looks weak, crash incoming, very bearish sentiment",
            created_at=now - timedelta(hours=3),
            source="rss",
        ),
    ]
    resp = build_response("BTC", mentions, "24h")
    assert resp.symbol == "BTC"
    assert -100 <= resp.score <= 100
    assert resp.mentions_24h >= 2
    assert len(resp.networks) >= 1
