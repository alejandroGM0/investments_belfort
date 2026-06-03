from belfort.news.models import CpVotes
from belfort.news.sentiment import tone_from_votes, tone_from_text


def test_tone_from_votes_positive():
    votes = CpVotes(positive=10, negative=1)
    tone, score = tone_from_votes(votes)
    assert tone == "positive"
    assert score > 0


def test_tone_from_votes_negative():
    votes = CpVotes(positive=1, negative=10, toxic=2)
    tone, score = tone_from_votes(votes)
    assert tone == "negative"
    assert score < 0


def test_tone_from_votes_empty_returns_none():
    assert tone_from_votes(CpVotes()) is None


def test_tone_from_text_positive():
    tone, score = tone_from_text(
        "Bitcoin surges to new all-time high amid strong institutional buying",
        "Markets rally on positive ETF inflows and bullish momentum.",
    )
    assert tone in ("positive", "neutral")
    assert score >= -100
