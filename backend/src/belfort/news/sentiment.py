"""Derive tone and score from CryptoPanic votes or VADER fallback."""

from __future__ import annotations

from belfort.news.models import CpPost, CpVotes, SentimentTone
from belfort.sentiment.nlp.scorer import score_text


def tone_from_votes(votes: CpVotes | None) -> tuple[SentimentTone, float] | None:
    if votes is None:
        return None
    pos = votes.positive + votes.liked
    neg = votes.negative + votes.disliked + votes.toxic
    total = pos + neg
    if total < 1:
        return None
    ratio = (pos - neg) / total
    score = max(-100.0, min(100.0, ratio * 100.0))
    if ratio > 0.25:
        tone: SentimentTone = "positive"
    elif ratio < -0.25:
        tone = "negative"
    else:
        tone = "neutral"
    return tone, score


def tone_from_text(title: str, description: str | None) -> tuple[SentimentTone, float]:
    text = title
    if description:
        text = f"{title}. {description}"
    polarity = score_text(text)
    if polarity is None:
        return "neutral", 0.0
    score = max(-100.0, min(100.0, polarity * 100.0))
    if polarity > 0.15:
        tone: SentimentTone = "positive"
    elif polarity < -0.15:
        tone = "negative"
    else:
        tone = "neutral"
    return tone, score


def classify_post(post: CpPost) -> tuple[SentimentTone, float]:
    from_votes = tone_from_votes(post.votes)
    if from_votes is not None:
        return from_votes
    return tone_from_text(post.title, post.description)
