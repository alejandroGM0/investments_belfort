"""
Confluence scoring engine.

Combines:
  - Active pattern signals (weighted by category and direction alignment)
  - Multi-timeframe trend alignment
  - Proximity to S/R levels
  - Historical backtest reliability (win_rate from DuckDB, when available)

Output: confluence_score (0–100) and per-pattern confidence (0.0–1.0).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

import numpy as np
import pandas as pd

from belfort.trend.analyzer import TrendResult

PatternCategory = Literal["candles", "chart_patterns", "structure", "indicators", "levels"]

# Category weights in the confluence score
_CAT_WEIGHT: dict[str, float] = {
    "candles": 1.0,
    "chart_patterns": 1.5,
    "structure": 1.2,
    "indicators": 0.8,
    "levels": 0.9,
}

# Score breakdown weights (must sum to 1.0)
_W_PATTERN = 0.40   # active signals × category weight
_W_TREND_ALIGN = 0.25  # pattern direction matches HTF trend
_W_SR_PROXIMITY = 0.15  # near S/R level
_W_BACKTEST = 0.20  # historical win_rate


@dataclass
class PatternSignal:
    pattern_id: str
    name: str
    category: str
    direction: int   # +1 bullish, -1 bearish, 0 neutral
    bar_time: int    # unix timestamp
    confidence: float = 0.0  # computed by compute_confidence()
    highlight: bool = False


@dataclass
class ConfluenceResult:
    confluence_score: int  # 0–100
    overall_direction: Literal["bullish", "bearish", "neutral"]
    signals: list[PatternSignal]
    highlights: list[PatternSignal]  # top-5


def _direction_label(net: float) -> Literal["bullish", "bearish", "neutral"]:
    if net > 0.2:
        return "bullish"
    if net < -0.2:
        return "bearish"
    return "neutral"


def compute_confidence(
    signal: PatternSignal,
    htf_trend: TrendResult | None,
    near_sr: bool,
    win_rate: float | None,  # from backtest DB, None if unavailable
) -> float:
    """
    Compute per-pattern confidence [0, 1].

    Components:
      - context (HTF trend alignment + S/R proximity): 0–0.40
      - historical reliability (backtest win_rate):     0–0.60
    When no backtest exists, caps at 0.50.
    """
    context_score = 0.0

    # Trend alignment
    if htf_trend is not None and signal.direction != 0:
        trend_dir = 1 if htf_trend.direction == "bullish" else (-1 if htf_trend.direction == "bearish" else 0)
        if trend_dir == signal.direction:
            context_score += 0.25 * min(htf_trend.strength / 100, 1.0)
        elif trend_dir == 0:
            context_score += 0.10

    # S/R proximity
    if near_sr:
        context_score += 0.15

    # Backtest
    if win_rate is not None:
        bt_score = max(0.0, (win_rate - 0.4) / 0.6)  # 0 at 40%, 1 at 100%
        total = context_score * 0.4 + bt_score * 0.6
    else:
        total = context_score  # max ~0.40 without backtest

    return round(min(total, 1.0), 3)


def score(
    active_signals: list[PatternSignal],
    htf_trend: TrendResult | None = None,
    near_sr: bool = False,
    backtest_win_rates: dict[str, float] | None = None,
) -> ConfluenceResult:
    """
    Compute overall confluence score from detected signals.

    Parameters
    ----------
    active_signals:
        PatternSignals where direction != 0, from the last completed bar.
    htf_trend:
        Trend result from a higher timeframe (e.g. 1D when scoring 4h).
    near_sr:
        Whether current price is near a support/resistance cluster.
    backtest_win_rates:
        Mapping pattern_id -> best win_rate from DuckDB. Optional.
    """
    if backtest_win_rates is None:
        backtest_win_rates = {}

    if not active_signals:
        return ConfluenceResult(
            confluence_score=0,
            overall_direction="neutral",
            signals=[],
            highlights=[],
        )

    # Compute confidence per signal
    for sig in active_signals:
        sig.confidence = compute_confidence(
            sig,
            htf_trend,
            near_sr,
            backtest_win_rates.get(sig.pattern_id),
        )

    # Net direction: weighted sum of signals × category weight × confidence
    bull_weight = sum(
        _CAT_WEIGHT.get(s.category, 1.0) * s.confidence
        for s in active_signals if s.direction == 1
    )
    bear_weight = sum(
        _CAT_WEIGHT.get(s.category, 1.0) * s.confidence
        for s in active_signals if s.direction == -1
    )
    total_weight = bull_weight + bear_weight or 1.0
    net = (bull_weight - bear_weight) / total_weight  # -1 to +1

    # Trend alignment bonus
    trend_bonus = 0.0
    if htf_trend and htf_trend.direction != "neutral":
        trend_dir = 1 if htf_trend.direction == "bullish" else -1
        if np.sign(net) == trend_dir:
            trend_bonus = 0.1 * htf_trend.strength / 100

    # S/R bonus
    sr_bonus = 0.05 if near_sr else 0.0

    # Scale to 0–100
    raw_score = (abs(net) + trend_bonus + sr_bonus) * 100
    confluence_score = int(min(raw_score, 100))

    # Highlight top-5 signals by confidence
    sorted_signals = sorted(active_signals, key=lambda s: s.confidence, reverse=True)
    highlights = sorted_signals[:5]
    for s in highlights:
        s.highlight = True

    return ConfluenceResult(
        confluence_score=confluence_score,
        overall_direction=_direction_label(net),
        signals=active_signals,
        highlights=highlights,
    )
