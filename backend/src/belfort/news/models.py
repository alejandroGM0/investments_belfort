"""Pydantic models aligned with contracts/openapi.yaml NewsResponse."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

SentimentTone = Literal["positive", "negative", "neutral", "mixed"]
SentimentFilter = Literal["positive", "negative", "neutral", "all"]


class NewsItem(BaseModel):
    id: str
    title: str
    source: str
    published_at: datetime
    tone: SentimentTone
    sentiment_score: float | None = None
    summary: str | None = None
    url: str


class NewsSummary(BaseModel):
    positive: int = 0
    negative: int = 0
    neutral: int = 0
    overall_tone: SentimentTone = "neutral"


class NewsResponse(BaseModel):
    symbol: str
    items: list[NewsItem]
    summary: NewsSummary
    updated_at: datetime


# --- CryptoPanic API shapes ---


class CpSource(BaseModel):
    title: str | None = None
    domain: str | None = None


class CpVotes(BaseModel):
    positive: int = 0
    negative: int = 0
    important: int = 0
    liked: int = 0
    disliked: int = 0
    lol: int = 0
    toxic: int = 0
    saved: int = 0
    comments: int = 0


class CpPost(BaseModel):
    id: int | str
    title: str
    url: str | None = None
    published_at: datetime | None = None
    created_at: datetime | None = None
    source: CpSource | None = None
    votes: CpVotes | None = None
    description: str | None = None


class CpPostsResponse(BaseModel):
    count: int | None = None
    next: str | None = None
    results: list[CpPost] = Field(default_factory=list)
