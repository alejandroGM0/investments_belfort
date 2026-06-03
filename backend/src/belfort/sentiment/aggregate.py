"""Aggregate scored mentions into SentimentResponse."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pandas as pd

from belfort.sentiment.models import (
    Mention,
    SentimentDataPoint,
    SentimentResponse,
    SentimentTone,
    SentimentWindow,
    SocialNetwork,
    TrendDirection,
)
from belfort.sentiment.nlp.scorer import score_text

WINDOW_HOURS: dict[SentimentWindow, int] = {
    "1h": 1,
    "4h": 4,
    "24h": 24,
    "7d": 168,
}

HISTORY_FREQ: dict[SentimentWindow, str] = {
    "1h": "15min",
    "4h": "1h",
    "24h": "4h",
    "7d": "1D",
}


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _tone_from_score(score: float) -> SentimentTone:
    if score > 20:
        return "positive"
    if score < -20:
        return "negative"
    if -20 <= score <= 20:
        return "neutral"
    return "neutral"


def _trend_from_history(history: list[SentimentDataPoint]) -> TrendDirection:
    if len(history) < 2:
        return "neutral"
    last = history[-1].score
    prev = history[-2].score
    delta = last - prev
    if delta > 5:
        return "bullish"
    if delta < -5:
        return "bearish"
    return "neutral"


def build_response(
    symbol: str,
    mentions: list[Mention],
    window: SentimentWindow,
    api_networks: list[SocialNetwork] | None = None,
) -> SentimentResponse:
    now = _utc_now()
    window_hours = WINDOW_HOURS[window]
    cutoff = now - timedelta(hours=window_hours)
    cutoff_24h = now - timedelta(hours=24)
    cutoff_7d = now - timedelta(hours=168)

    rows: list[dict] = []
    for m in mentions:
        compound = score_text(m.text)
        if compound is None:
            continue
        rows.append(
            {
                "created_at": m.created_at,
                "source": m.source,
                "compound": compound,
            }
        )

    if not rows:
        networks = api_networks or []
        return SentimentResponse(
            symbol=symbol.upper(),
            score=0.0,
            tone="neutral",
            mentions_24h=0,
            mentions_7d=0,
            trend="neutral",
            networks=networks,
            history=[],
            updated_at=now,
        )

    df = pd.DataFrame(rows)
    if df["created_at"].dt.tz is None:
        df["created_at"] = df["created_at"].dt.tz_localize(timezone.utc)
    else:
        df["created_at"] = df["created_at"].dt.tz_convert(timezone.utc)

    in_window = df[df["created_at"] >= cutoff]
    in_24h = df[df["created_at"] >= cutoff_24h]
    in_7d = df[df["created_at"] >= cutoff_7d]

    global_score = float(in_window["compound"].mean() * 100) if len(in_window) else 0.0
    global_score = max(-100.0, min(100.0, global_score))

    networks: list[SocialNetwork] = []
    for source, label in [("reddit", "Reddit"), ("rss", "RSS")]:
        sub = in_window[in_window["source"] == source]
        if len(sub) == 0:
            continue
        networks.append(
            SocialNetwork(
                name=label,
                score=round(float(sub["compound"].mean() * 100), 1),
                mentions=len(sub),
            )
        )

    if api_networks:
        for net in api_networks:
            if not any(n.name == net.name for n in networks):
                networks.append(net)

    history: list[SentimentDataPoint] = []
    if len(in_window) > 0:
        hist_df = in_window.set_index("created_at").sort_index()
        freq = HISTORY_FREQ[window]
        try:
            buckets = hist_df["compound"].resample(freq).agg(["mean", "count"])
            for ts, row in buckets.iterrows():
                if pd.isna(row["mean"]) or row["count"] == 0:
                    continue
                history.append(
                    SentimentDataPoint(
                        time=ts.to_pydatetime().replace(tzinfo=timezone.utc),
                        score=round(float(row["mean"] * 100), 1),
                        mentions=int(row["count"]),
                    )
                )
        except Exception:
            pass

    tone: SentimentTone = _tone_from_score(global_score)
    pos = (in_window["compound"] > 0.05).sum()
    neg = (in_window["compound"] < -0.05).sum()
    if pos > 0 and neg > 0 and abs(pos - neg) < max(pos, neg) * 0.3:
        tone = "mixed"

    return SentimentResponse(
        symbol=symbol.upper(),
        score=round(global_score, 1),
        tone=tone,
        mentions_24h=len(in_24h),
        mentions_7d=len(in_7d),
        trend=_trend_from_history(history),
        networks=networks,
        history=history[-24:],
        updated_at=now,
    )
