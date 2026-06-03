import json
from pathlib import Path

from belfort.news.mapper import map_post
from belfort.news.models import CpPost, CpPostsResponse

FIXTURE = Path(__file__).parent / "fixtures" / "cryptopanic_posts.json"


def test_map_post_from_fixture():
    data = json.loads(FIXTURE.read_text())
    posts = CpPostsResponse.model_validate(data).results
    item = map_post(posts[0])
    assert item.id == "1001"
    assert item.title.startswith("Bitcoin")
    assert item.source == "CoinDesk"
    assert item.tone == "positive"
    assert item.url == "https://example.com/btc-etf"


def test_map_post_negative_votes():
    post = CpPost.model_validate(
        {
            "id": 2,
            "title": "Major hack drains exchange",
            "url": "https://x.com/hack",
            "published_at": "2026-06-01T12:00:00Z",
            "source": {"title": "News"},
            "votes": {"positive": 0, "negative": 20},
        }
    )
    item = map_post(post)
    assert item.tone == "negative"
    assert item.sentiment_score is not None
    assert item.sentiment_score < 0
