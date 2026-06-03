"""Pydantic models aligned with contracts/openapi.yaml SentimentResponse."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

SentimentTone = Literal["positive", "negative", "neutral", "mixed"]
TrendDirection = Literal["bullish", "bearish", "neutral"]
SentimentWindow = Literal["1h", "4h", "24h", "7d"]


class SentimentDataPoint(BaseModel):
    time: datetime
    score: float
    mentions: int


class SocialNetwork(BaseModel):
    name: str
    score: float
    mentions: int


class SentimentResponse(BaseModel):
    symbol: str
    score: float = Field(ge=-100, le=100)
    tone: SentimentTone
    mentions_24h: int
    mentions_7d: int | None = None
    trend: TrendDirection | None = None
    networks: list[SocialNetwork] = Field(default_factory=list)
    history: list[SentimentDataPoint] = Field(default_factory=list)
    updated_at: datetime


class Mention(BaseModel):
    """Raw mention before aggregation."""

    text: str
    created_at: datetime
    source: Literal["reddit", "rss"]
