"""VADER + TextBlob sentiment scoring."""

from __future__ import annotations

from functools import lru_cache

from textblob import TextBlob
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

MIN_TEXT_LEN = 12


@lru_cache(maxsize=1)
def _vader() -> SentimentIntensityAnalyzer:
    return SentimentIntensityAnalyzer()


def score_text(text: str) -> float | None:
    """
    Combined polarity in [-1, 1].
    Returns None if text is too short or empty.
    """
    cleaned = " ".join(text.split())
    if len(cleaned) < MIN_TEXT_LEN:
        return None

    vader_compound = _vader().polarity_scores(cleaned)["compound"]
    blob_polarity = TextBlob(cleaned).sentiment.polarity
    return 0.6 * vader_compound + 0.4 * blob_polarity
