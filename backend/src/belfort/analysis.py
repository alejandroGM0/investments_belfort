"""
High-level analysis pipeline.

Used by both the CLI (`belfort analyze`) and the FastAPI route (`/analysis/{symbol}`).
Returns an AnalysisReport dataclass that api/mappers.py converts to the OpenAPI schema.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal

import pandas as pd

from belfort.data.loader import load as load_ohlcv
from belfort.indicators.compute import compute_all
from belfort.patterns import registry as reg
from belfort.patterns.levels import detect_levels
from belfort.scoring.confluence import ConfluenceResult, PatternSignal, score
from belfort.storage.db import all_win_rates
from belfort.trend.analyzer import TrendResult, analyze_multi

TrendDir = Literal["bullish", "bearish", "neutral"]


@dataclass
class DetectedPattern:
    pattern_id: str
    name: str
    category: str
    direction: int       # +1 / -1
    bar_time: int        # unix seconds
    confidence: float
    highlight: bool
    description: str


@dataclass
class Level:
    price: float
    level_type: Literal["support", "resistance"]
    strength: float  # 0–1


@dataclass
class TradeSetup:
    entry: float
    stop_loss: float
    take_profit: float
    risk_reward: float
    direction: TrendDir


@dataclass
class IndicatorSnapshot:
    name: str
    value: float
    signal: TrendDir
    zone: str | None  # overbought / oversold / neutral
    description: str


@dataclass
class AnalysisReport:
    symbol: str
    tf: str
    updated_at: str
    trend: TrendDir
    trend_strength: int
    confluence_score: int
    patterns: list[DetectedPattern]
    highlights: list[DetectedPattern]
    indicators: list[IndicatorSnapshot]
    levels: list[Level]
    trade_setup: TradeSetup | None
    timeframe_trends: dict[str, dict]  # {tf: {trend, strength}}


def _direction_label(d: int) -> TrendDir:
    if d == 1:
        return "bullish"
    if d == -1:
        return "bearish"
    return "neutral"


def _indicator_snapshots(df_enriched: pd.DataFrame) -> list[IndicatorSnapshot]:
    last = df_enriched.iloc[-1]
    snaps: list[IndicatorSnapshot] = []

    def _snap(name: str, value: float, signal: TrendDir, zone: str | None = None, desc: str = ""):
        if pd.isna(value):
            return
        snaps.append(IndicatorSnapshot(name=name, value=round(value, 4), signal=signal, zone=zone, description=desc))

    rsi = last.get("RSI", float("nan"))
    rsi_signal: TrendDir = "bullish" if rsi > 55 else ("bearish" if rsi < 45 else "neutral")
    rsi_zone = "overbought" if rsi > 70 else ("oversold" if rsi < 30 else "neutral")
    _snap("RSI", rsi, rsi_signal, rsi_zone, "Relative Strength Index (14)")

    macd = last.get("MACD", float("nan"))
    macd_sig = last.get("MACD_signal", float("nan"))
    macd_dir: TrendDir = "bullish" if macd > macd_sig else "bearish"
    _snap("MACD", macd, macd_dir, None, "MACD line vs signal")

    adx = last.get("ADX", float("nan"))
    adx_dir: TrendDir = "bullish" if adx >= 25 else "neutral"
    _snap("ADX", adx, adx_dir, None, "Average Directional Index (trending ≥ 25)")

    atr = last.get("ATR", float("nan"))
    _snap("ATR", atr, "neutral", None, "Average True Range (14) — volatility")

    stoch_k = last.get("STOCH_k", float("nan"))
    stoch_zone = "overbought" if stoch_k > 80 else ("oversold" if stoch_k < 20 else "neutral")
    stoch_dir: TrendDir = "bullish" if stoch_k < 30 else ("bearish" if stoch_k > 70 else "neutral")
    _snap("Stochastic %K", stoch_k, stoch_dir, stoch_zone, "Stochastic Oscillator")

    bb_upper = last.get("BB_upper", float("nan"))
    bb_lower = last.get("BB_lower", float("nan"))
    close = last.get("close", float("nan"))
    if not pd.isna(bb_upper) and not pd.isna(close):
        bb_dir: TrendDir = "bearish" if close > bb_upper else ("bullish" if close < bb_lower else "neutral")
        bb_zone = "overbought" if close > bb_upper else ("oversold" if close < bb_lower else "neutral")
        _snap("Bollinger Band pos.", close / ((bb_upper + bb_lower) / 2), bb_dir, bb_zone, "Price vs BB bands")

    willr = last.get("WILLR", float("nan"))
    willr_dir: TrendDir = "bullish" if willr < -80 else ("bearish" if willr > -20 else "neutral")
    _snap("Williams %R", willr, willr_dir, None, "Williams Percent Range (14)")

    return snaps


def _build_trade_setup(
    df: pd.DataFrame, direction: TrendDir
) -> TradeSetup | None:
    if direction == "neutral" or len(df) < 14:
        return None
    atr_val = float(((df["high"] - df["low"]).rolling(14).mean()).iloc[-1] or 0)
    entry = float(df["close"].iloc[-1])
    sl = entry - 1.5 * atr_val if direction == "bullish" else entry + 1.5 * atr_val
    tp = entry + 3.0 * atr_val if direction == "bullish" else entry - 3.0 * atr_val
    rr = abs(tp - entry) / max(abs(entry - sl), 1e-9)
    return TradeSetup(
        entry=round(entry, 6),
        stop_loss=round(sl, 6),
        take_profit=round(tp, 6),
        risk_reward=round(rr, 2),
        direction=direction,
    )


def run(
    symbol: str,
    tf: str,
    since: str = "2y",
    refresh: bool = False,
    extra_tfs: list[str] | None = None,
) -> AnalysisReport:
    """
    Full analysis pipeline.

    Parameters
    ----------
    symbol:    e.g. 'BTCUSDT'
    tf:        primary timeframe ('1h', '4h', '1D')
    since:     lookback if no cache ('2y', '6m', ...)
    refresh:   force OHLCV refresh from Binance
    extra_tfs: additional timeframes for multi-TF trend (default: ['1D'] when tf=='4h')
    """
    if extra_tfs is None:
        extra_tfs = ["1D"] if tf in ("1h", "4h") else []

    # --- Load primary OHLCV ---
    df = load_ohlcv(symbol, tf, since=since, refresh=refresh)
    if df.empty:
        raise ValueError(f"No OHLCV data for {symbol}/{tf}")

    df_enriched = compute_all(df)

    # --- Multi-TF trend ---
    tf_dfs: dict[str, pd.DataFrame] = {tf: df}
    for etf in extra_tfs:
        etf_df = load_ohlcv(symbol, etf, since=since, refresh=False)
        if not etf_df.empty:
            tf_dfs[etf] = etf_df

    tf_trends: dict[str, TrendResult] = analyze_multi(tf_dfs)
    primary_trend = tf_trends[tf]
    htf_trend = tf_trends.get(extra_tfs[0]) if extra_tfs else None

    # --- Detect all patterns on primary TF ---
    active_signals: list[PatternSignal] = []
    all_detected: list[DetectedPattern] = []
    last_bar_time = int(df["time"].iloc[-1])

    for spec in reg.REGISTRY:
        try:
            series = spec.detect(df_enriched)
        except Exception:
            continue
        last_val = int(series.iloc[-1])
        if last_val != 0:
            sig = PatternSignal(
                pattern_id=spec.id,
                name=spec.name,
                category=spec.category,
                direction=last_val,
                bar_time=last_bar_time,
            )
            active_signals.append(sig)

    # --- Levels ---
    raw_levels = detect_levels(df)
    near_sr = bool(
        any(abs(float(df["close"].iloc[-1]) - s) < float((df["high"] - df["low"]).rolling(14).mean().iloc[-1] or 1) * 0.5
            for s in raw_levels["support"] + raw_levels["resistance"])
    )

    # --- Backtest win rates (if available) ---
    win_rates = all_win_rates(symbol, tf)

    # --- Confluence score ---
    result: ConfluenceResult = score(
        active_signals=active_signals,
        htf_trend=htf_trend,
        near_sr=near_sr,
        backtest_win_rates=win_rates,
    )

    # --- Build pattern list ---
    sig_map = {s.pattern_id: s for s in result.signals}
    highlight_ids = {s.pattern_id for s in result.highlights}

    for spec in reg.REGISTRY:
        try:
            series = spec.detect(df_enriched)
        except Exception:
            continue
        last_val = int(series.iloc[-1])
        if last_val != 0:
            sig = sig_map.get(spec.id)
            conf = sig.confidence if sig else 0.0
            all_detected.append(DetectedPattern(
                pattern_id=spec.id,
                name=spec.name,
                category=spec.category,
                direction=last_val,
                bar_time=last_bar_time,
                confidence=conf,
                highlight=spec.id in highlight_ids,
                description=spec.description,
            ))

    highlights = [p for p in all_detected if p.highlight]

    # --- Levels ---
    level_objs: list[Level] = []
    for price in raw_levels["support"]:
        level_objs.append(Level(price=round(price, 6), level_type="support", strength=0.7))
    for price in raw_levels["resistance"]:
        level_objs.append(Level(price=round(price, 6), level_type="resistance", strength=0.7))

    # --- Indicators ---
    indicator_snaps = _indicator_snapshots(df_enriched)

    # --- Trade setup ---
    trade_setup = _build_trade_setup(df, result.overall_direction)

    # --- TF trend summary ---
    tf_trend_summary = {
        t: {"trend": r.direction, "strength": r.strength}
        for t, r in tf_trends.items()
    }

    return AnalysisReport(
        symbol=symbol,
        tf=tf,
        updated_at=datetime.now(tz=timezone.utc).isoformat(),
        trend=primary_trend.direction,
        trend_strength=primary_trend.strength,
        confluence_score=result.confluence_score,
        patterns=all_detected,
        highlights=highlights,
        indicators=indicator_snaps,
        levels=level_objs,
        trade_setup=trade_setup,
        timeframe_trends=tf_trend_summary,
    )
