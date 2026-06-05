from __future__ import annotations

import asyncio
from math import ceil, sqrt
from typing import Any, Literal

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from belfort.analysis import run as run_analysis
from belfort.api.mappers import report_to_analysis_response
from belfort.chart_filters import (
    PatternDirectionFilter,
    PatternStatusFilter,
    filter_levels,
    parse_categories,
    pattern_ids_to_scan,
)
from belfort.chart_overlays import build_ema_series, build_projection
from belfort.data.loader import load as load_ohlcv
from belfort.indicators.compute import compute_all
from belfort.jobs import queue as q
from belfort.patterns import registry as reg
from belfort.patterns.registry import get as get_pattern
from belfort.storage.db import has_any_results, top_runs

router = APIRouter()

HistoryParam = Literal["2y", "5y", "max"]


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _timeframe_hours(tf: str) -> float:
    normalized = tf.lower()
    if normalized.endswith("h"):
        return float(normalized[:-1] or 1)
    if normalized.endswith("d"):
        return float(normalized[:-1] or 1) * 24
    if normalized.endswith("w"):
        return float(normalized[:-1] or 1) * 24 * 7
    return 4.0


def _bars_to_human(tf: str, bars: int) -> str:
    hours = bars * _timeframe_hours(tf)
    if hours < 24:
        return f"~{ceil(hours)}h"
    days = hours / 24
    if days < 14:
        return f"~{days:.1f} días"
    weeks = days / 7
    return f"~{weeks:.1f} semanas"


def _time_range_human(tf: str, bars_min: int, bars_max: int) -> str:
    return f"{_bars_to_human(tf, bars_min)} – {_bars_to_human(tf, bars_max)}"


def _wilson_interval(p: float, n: int) -> tuple[float, float]:
    if n <= 0:
        return (_clamp(p - 0.14, 0.05, 0.95), _clamp(p + 0.14, 0.05, 0.95))
    z = 1.96
    denom = 1 + z**2 / n
    center = (p + z**2 / (2 * n)) / denom
    margin = z * sqrt((p * (1 - p) + z**2 / (4 * n)) / n) / denom
    return (_clamp(center - margin, 0.05, 0.95), _clamp(center + margin, 0.05, 0.95))


def _sample_confidence(total_trades: int, has_backtest: bool) -> str:
    if not has_backtest:
        return "low"
    if total_trades >= 120:
        return "high"
    if total_trades >= 40:
        return "medium"
    return "low"


def _decision(
    direction: str,
    score: int,
    probability: float | None,
    expectancy_r: float | None,
    rr: float,
) -> tuple[str, str]:
    if direction == "neutral" or probability is None or expectancy_r is None:
        return "wait", "Esperar"
    if expectancy_r <= 0 or probability < 0.48 or score < 45:
        return "avoid", "Evitar"
    prefix = "Long" if direction == "bullish" else "Short"
    if score >= 75 and probability >= 0.60 and expectancy_r >= 0.35 and rr >= 1.7:
        key = "strong_long" if direction == "bullish" else "strong_short"
        return key, f"{prefix} fuerte"
    if score >= 58 and probability >= 0.53 and expectancy_r > 0.10 and rr >= 1.4:
        key = "long" if direction == "bullish" else "short"
        return key, f"{prefix} válido"
    return "wait", "Esperar confirmación"


def _best_contextual_run(symbol: str, tf: str, report: Any) -> dict[str, Any] | None:
    rows = top_runs(symbol, tf, n=80, sort_by="sharpe")
    if not rows:
        return None

    active_ids = {p.pattern_id for p in report.highlights if p.status == "active"}
    if active_ids:
        for row in rows:
            if row.get("pattern_id") in active_ids:
                return row

    directional_ids = {
        p.pattern_id
        for p in report.patterns
        if p.status in {"active", "recent"}
        and (
            (
                report.trade_setup
                and report.trade_setup.direction == "bullish"
                and p.direction == 1
            )
            or (
                report.trade_setup
                and report.trade_setup.direction == "bearish"
                and p.direction == -1
            )
        )
    }
    if directional_ids:
        for row in rows:
            if row.get("pattern_id") in directional_ids:
                return row

    return rows[0]


def _nearest_levels(
    levels: list[Any], entry: float
) -> tuple[dict[str, float] | None, dict[str, float] | None]:
    supports = [lv for lv in levels if lv.level_type == "support"]
    resistances = [lv for lv in levels if lv.level_type == "resistance"]
    nearest_support = min(supports, key=lambda lv: abs(lv.price - entry), default=None)
    nearest_resistance = min(
        resistances, key=lambda lv: abs(lv.price - entry), default=None
    )
    return (
        {"price": nearest_support.price, "strength": nearest_support.strength}
        if nearest_support
        else None,
        {"price": nearest_resistance.price, "strength": nearest_resistance.strength}
        if nearest_resistance
        else None,
    )


def _build_operational_setup_response(
    symbol: str, tf: str, history: str
) -> dict[str, Any]:
    report = run_analysis(symbol, tf, since=history)
    df = load_ohlcv(symbol, tf, since=history)
    if df.empty:
        raise ValueError(f"No data for {symbol}/{tf}")

    if report.trade_setup is None:
        return {
            "symbol": symbol,
            "tf": tf,
            "direction": "neutral",
            "decision": "wait",
            "decision_label": "Esperar",
            "decision_score": max(0, min(report.confluence_score, 100)),
            "confidence_score": max(0, min(report.confluence_score, 100)),
            "confluence_score": report.confluence_score,
            "entry": None,
            "stop_loss": None,
            "take_profit": None,
            "risk_reward": None,
            "risk_pct": None,
            "reward_pct": None,
            "probability": None,
            "expectancy": None,
            "time_estimate": None,
            "backtest_context": None,
            "evidence": [
                {
                    "label": "Sin dirección operativa",
                    "impact": "neutral",
                    "detail": "La confluencia actual no produce un setup direccional claro.",
                }
            ],
            "warnings": [
                "No hay setup operativo activo: esperar nueva señal o mayor confluencia."
            ],
            "invalidation": [],
            "scenarios": [
                {
                    "name": "Espera",
                    "probability": None,
                    "trigger": "Nueva señal direccional",
                    "expected_move": "Sin proyección fiable",
                    "action": "No abrir posición todavía.",
                }
            ],
            "updated_at": report.updated_at,
        }

    setup = report.trade_setup
    entry = float(setup.entry)
    stop_loss = float(setup.stop_loss)
    take_profit = float(setup.take_profit)
    risk_abs = abs(entry - stop_loss)
    reward_abs = abs(take_profit - entry)
    risk_pct = risk_abs / entry * 100 if entry else 0.0
    reward_pct = reward_abs / entry * 100 if entry else 0.0

    context_run = _best_contextual_run(symbol, tf, report)
    has_backtest = bool(context_run and int(context_run.get("total_trades") or 0) > 0)
    total_trades = int((context_run or {}).get("total_trades") or 0)
    historical_win_rate = (
        float((context_run or {}).get("win_rate") or 0.0) if has_backtest else None
    )
    base_probability = historical_win_rate if historical_win_rate is not None else 0.50

    confluence_adjustment = (report.confluence_score - 50) / 100 * 0.16
    tf_trends = report.timeframe_trends or {}
    htf_items = [(k, v) for k, v in tf_trends.items() if k != tf]
    htf_trend = htf_items[0][1] if htf_items else None
    htf_direction = htf_trend.get("trend") if isinstance(htf_trend, dict) else None
    trend_adjustment = 0.0
    if htf_direction and htf_direction != "neutral":
        trend_adjustment = 0.035 if htf_direction == setup.direction else -0.045
    rr_adjustment = _clamp((setup.risk_reward - 1.5) * 0.025, -0.035, 0.045)
    adjusted_probability = _clamp(
        base_probability + confluence_adjustment + trend_adjustment + rr_adjustment,
        0.30,
        0.78,
    )
    probability_low, probability_high = _wilson_interval(
        adjusted_probability, total_trades
    )
    probability_confidence = _sample_confidence(total_trades, has_backtest)

    expectancy_r = adjusted_probability * setup.risk_reward - (1 - adjusted_probability)
    expected_return_pct = expectancy_r * risk_pct

    range_atr = float(((df["high"] - df["low"]).rolling(14).mean()).iloc[-1] or 0)
    if pd.isna(range_atr) or range_atr <= 0:
        range_atr = float((df["high"] - df["low"]).tail(20).mean() or 0)
    if range_atr <= 0:
        range_atr = max(risk_abs, 1e-9)

    tp_bars_median = max(1, ceil(reward_abs / range_atr * 1.6))
    sl_bars_median = max(1, ceil(risk_abs / range_atr * 1.4))
    tp_bars_min = max(1, ceil(tp_bars_median * 0.55))
    tp_bars_max = max(tp_bars_median + 1, ceil(tp_bars_median * 1.85))
    volatility_pct = range_atr / entry * 100 if entry else 0.0
    time_confidence = "medium" if len(df) >= 120 else "low"

    technical_score = report.confluence_score * 0.45
    probability_score = adjusted_probability * 100 * 0.30
    expectancy_score = _clamp((expectancy_r + 0.25) / 1.25, 0, 1) * 100 * 0.15
    sample_score = {"high": 100, "medium": 70, "low": 40}[probability_confidence] * 0.10
    decision_score = int(
        round(
            _clamp(
                technical_score + probability_score + expectancy_score + sample_score,
                0,
                100,
            )
        )
    )
    decision_key, decision_label = _decision(
        setup.direction,
        decision_score,
        adjusted_probability,
        expectancy_r,
        setup.risk_reward,
    )

    indicators = {ind.name: ind for ind in report.indicators}
    rsi = indicators.get("RSI")
    adx = indicators.get("ADX")
    nearest_support, nearest_resistance = _nearest_levels(report.levels, entry)
    active_highlights = [p for p in report.highlights if p.status == "active"]

    evidence = [
        {
            "label": "Confluencia técnica",
            "impact": "positive"
            if report.confluence_score >= 60
            else "neutral"
            if report.confluence_score >= 40
            else "negative",
            "detail": f"Score actual {report.confluence_score}/100.",
        },
        {
            "label": "Tendencia principal",
            "impact": "positive"
            if report.trend == setup.direction
            else "neutral"
            if report.trend == "neutral"
            else "negative",
            "detail": f"{tf}: {report.trend} con fuerza {report.trend_strength}/100.",
        },
    ]
    if htf_direction:
        evidence.append(
            {
                "label": "Alineación multi-timeframe",
                "impact": "positive"
                if htf_direction == setup.direction
                else "negative"
                if htf_direction != "neutral"
                else "neutral",
                "detail": f"Timeframe superior: {htf_direction}.",
            }
        )
    if active_highlights:
        evidence.append(
            {
                "label": "Patrones activos destacados",
                "impact": "positive",
                "detail": ", ".join(p.name for p in active_highlights[:3]),
            }
        )
    if has_backtest:
        evidence.append(
            {
                "label": "Backtest comparable",
                "impact": "positive"
                if base_probability >= 0.55
                else "neutral"
                if base_probability >= 0.48
                else "negative",
                "detail": f"Win rate histórico {base_probability * 100:.1f}% sobre {total_trades} trades.",
            }
        )
    else:
        evidence.append(
            {
                "label": "Backtest no disponible",
                "impact": "neutral",
                "detail": "La probabilidad usa proxy técnico hasta que termine el backtest rápido.",
            }
        )
    if nearest_support and setup.direction == "bullish":
        evidence.append(
            {
                "label": "Soporte cercano",
                "impact": "positive",
                "detail": f"Soporte aprox. {nearest_support['price']:.6g} con fuerza {nearest_support['strength'] * 100:.0f}%.",
            }
        )
    if nearest_resistance and setup.direction == "bearish":
        evidence.append(
            {
                "label": "Resistencia cercana",
                "impact": "positive",
                "detail": f"Resistencia aprox. {nearest_resistance['price']:.6g} con fuerza {nearest_resistance['strength'] * 100:.0f}%.",
            }
        )

    warnings: list[str] = []
    if not has_backtest:
        warnings.append(
            "Probabilidad con baja confianza: no hay backtest suficiente para este símbolo/timeframe."
        )
    elif total_trades < 40:
        warnings.append(
            f"Muestra histórica pequeña ({total_trades} trades): interpretar probabilidad con cautela."
        )
    if rsi and rsi.zone == "overbought" and setup.direction == "bullish":
        warnings.append(
            "RSI en sobrecompra: posible entrada tardía o pullback antes de continuar."
        )
    if rsi and rsi.zone == "oversold" and setup.direction == "bearish":
        warnings.append("RSI en sobreventa: posible rebote contra la posición corta.")
    if adx and adx.value < 20:
        warnings.append(
            "ADX bajo: tendencia débil, mayor probabilidad de lateralización."
        )
    if volatility_pct > 4:
        warnings.append(
            f"Volatilidad alta: ATR aproximado {volatility_pct:.2f}% del precio."
        )
    if setup.risk_reward < 1.5:
        warnings.append(
            "Riesgo/beneficio inferior a 1.5R: exige mayor probabilidad para compensar."
        )

    stop_word = "debajo" if setup.direction == "bullish" else "encima"
    opposite_level = (
        nearest_support if setup.direction == "bullish" else nearest_resistance
    )
    invalidation = [
        f"Cierre de vela {tf} {stop_word} de {stop_loss:.6g} invalida el setup por SL.",
        "Confluencia por debajo de 45/100 reduce la validez operativa.",
    ]
    if opposite_level:
        invalidation.append(
            f"Pérdida del nivel estructural {opposite_level['price']:.6g} debilita la tesis."
        )

    favorable_trigger = (
        f"Ruptura/continuación sobre {entry:.6g}"
        if setup.direction == "bullish"
        else f"Ruptura/continuación bajo {entry:.6g}"
    )
    adverse_trigger = (
        f"Cierre bajo {stop_loss:.6g}"
        if setup.direction == "bullish"
        else f"Cierre sobre {stop_loss:.6g}"
    )
    scenarios = [
        {
            "name": "Base",
            "probability": round(adjusted_probability, 3),
            "trigger": f"Mantener entrada alrededor de {entry:.6g}",
            "expected_move": f"Objetivo {take_profit:.6g} en {tp_bars_min}-{tp_bars_max} velas",
            "action": f"{decision_label} con riesgo controlado si se respeta el SL.",
        },
        {
            "name": "Confirmación",
            "probability": round(_clamp(adjusted_probability + 0.04, 0.05, 0.90), 3),
            "trigger": favorable_trigger,
            "expected_move": "Mejora la probabilidad si rompe con vela fuerte y sin rechazo inmediato.",
            "action": "Entrada por confirmación o añadir solo si el riesgo efectivo no empeora.",
        },
        {
            "name": "Invalidación",
            "probability": round(_clamp(1 - adjusted_probability, 0.05, 0.90), 3),
            "trigger": adverse_trigger,
            "expected_move": "Mayor probabilidad de continuación contra el setup.",
            "action": "No entrar o cerrar según plan de gestión de riesgo.",
        },
    ]

    spec = get_pattern(str(context_run.get("pattern_id"))) if context_run else None
    backtest_context = None
    if context_run:
        backtest_context = {
            "pattern_id": context_run.get("pattern_id"),
            "pattern_name": spec.name if spec else context_run.get("pattern_id"),
            "pattern_category": spec.category if spec else None,
            "total_trades": total_trades,
            "win_rate": round(float(context_run.get("win_rate") or 0), 4),
            "profit_factor": round(float(context_run.get("profit_factor") or 0), 4),
            "sharpe": round(float(context_run.get("sharpe") or 0), 4),
            "max_drawdown": round(float(context_run.get("max_drawdown") or 0), 4),
            "expectancy": round(float(context_run.get("expectancy") or 0), 6),
            "avg_win": round(float(context_run.get("avg_win") or 0), 6),
            "avg_loss": round(float(context_run.get("avg_loss") or 0), 6),
            "params": context_run.get("params") or {},
            "run_at": context_run.get("run_at"),
        }

    return {
        "symbol": symbol,
        "tf": tf,
        "direction": setup.direction,
        "decision": decision_key,
        "decision_label": decision_label,
        "decision_score": decision_score,
        "confidence_score": decision_score,
        "confluence_score": report.confluence_score,
        "entry": round(entry, 6),
        "stop_loss": round(stop_loss, 6),
        "take_profit": round(take_profit, 6),
        "risk_reward": round(setup.risk_reward, 2),
        "risk_pct": round(risk_pct, 3),
        "reward_pct": round(reward_pct, 3),
        "probability": {
            "win": round(adjusted_probability, 3),
            "loss": round(1 - adjusted_probability, 3),
            "low": round(probability_low, 3),
            "high": round(probability_high, 3),
            "confidence": probability_confidence,
            "sample_size": total_trades,
            "source": "backtest_adjusted" if has_backtest else "technical_proxy",
            "historical_win_rate": round(historical_win_rate, 3)
            if historical_win_rate is not None
            else None,
        },
        "expectancy": {
            "r": round(expectancy_r, 3),
            "return_pct": round(expected_return_pct, 3),
            "label": "positive"
            if expectancy_r > 0.15
            else "neutral"
            if expectancy_r >= 0
            else "negative",
        },
        "time_estimate": {
            "tp_bars_min": tp_bars_min,
            "tp_bars_median": tp_bars_median,
            "tp_bars_max": tp_bars_max,
            "tp_human": _time_range_human(tf, tp_bars_min, tp_bars_max),
            "sl_bars_median": sl_bars_median,
            "sl_human": _bars_to_human(tf, sl_bars_median),
            "confidence": time_confidence,
            "atr": round(range_atr, 6),
            "atr_pct": round(volatility_pct, 3),
            "tp_distance_atr": round(reward_abs / range_atr, 2),
            "sl_distance_atr": round(risk_abs / range_atr, 2),
        },
        "backtest_context": backtest_context,
        "evidence": evidence,
        "warnings": warnings,
        "invalidation": invalidation,
        "scenarios": scenarios,
        "updated_at": report.updated_at,
    }


@router.get("/analysis/{symbol}")
async def get_analysis(
    symbol: str,
    tf: str = Query("4h"),
    history: HistoryParam = Query("5y"),
    category: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
):
    try:
        report = await asyncio.to_thread(run_analysis, symbol, tf, since=history)
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Analysis failed: {e}")

    response = report_to_analysis_response(report, page, page_size, category)

    # Auto-trigger quick backtest on cold start
    if not has_any_results(symbol, tf):
        bt_job_id = q.enqueue("backtest_quick", {"symbol": symbol, "tf": tf})
        response["backtest_status"] = "pending"
        response["backtest_job_id"] = bt_job_id
    else:
        response["backtest_status"] = "ready"

    return response


def _pattern_marker(pattern_id: str, name: str, direction: int, bar_time: int) -> dict:
    return {
        "time": bar_time,
        "position": "belowBar" if direction == 1 else "aboveBar",
        "shape": "arrowUp" if direction == 1 else "arrowDown",
        "color": "#26a69a" if direction == 1 else "#ef5350",
        "text": name[:20],
        "pattern_id": pattern_id,
    }


@router.get("/analysis/{symbol}/chart-markers")
async def get_chart_markers(
    symbol: str,
    tf: str = Query("4h"),
    from_ts: int | None = Query(None, alias="from"),
    to_ts: int | None = Query(None, alias="to"),
    min_confidence: float = Query(0.35, ge=0, le=1),
    pattern_status: PatternStatusFilter = Query("active_recent"),
    pattern_direction: PatternDirectionFilter = Query("all"),
    categories: str | None = Query(
        None, description="Comma-separated categories or 'all'"
    ),
    max_markers: int = Query(80, ge=5, le=200),
    history: HistoryParam = Query("5y"),
):
    def _build_markers() -> list[dict]:
        try:
            report = run_analysis(symbol, tf, since=history)
            df = load_ohlcv(symbol, tf, since=history)
        except ValueError as e:
            raise HTTPException(404, str(e))

        if df.empty:
            return []

        df_enriched = compute_all(df)
        cat_set = parse_categories(categories)
        scan_ids = pattern_ids_to_scan(
            report,
            status_filter=pattern_status,
            min_confidence=min_confidence,
            categories=cat_set,
            direction_filter=pattern_direction,
        )

        markers: list[dict] = []
        seen: set[tuple[str, int]] = set()

        for spec in reg.REGISTRY:
            if spec.id not in scan_ids:
                continue
            if cat_set and spec.category not in cat_set:
                continue
            try:
                series = spec.detect(df_enriched)
            except Exception:
                continue
            fired = series[series != 0]
            if fired.empty:
                continue
            for idx in fired.index[-80:]:
                bar_time = int(df_enriched["time"].iloc[idx])
                if from_ts and bar_time < from_ts:
                    continue
                if to_ts and bar_time > to_ts:
                    continue
                direction = int(series.iloc[idx])
                if pattern_direction == "bull" and direction != 1:
                    continue
                if pattern_direction == "bear" and direction != -1:
                    continue
                key = (spec.id, bar_time)
                if key in seen:
                    continue
                seen.add(key)
                markers.append(_pattern_marker(spec.id, spec.name, direction, bar_time))
                if len(markers) >= max_markers:
                    break
            if len(markers) >= max_markers:
                break

        markers.sort(key=lambda m: m["time"])
        return markers

    return await asyncio.to_thread(_build_markers)


@router.get("/analysis/{symbol}/chart-overlays")
async def get_chart_overlays(
    symbol: str,
    tf: str = Query("4h"),
    history: HistoryParam = Query("5y"),
    projection_bars: int = Query(16, ge=4, le=48),
    min_level_strength: float = Query(0.0, ge=0, le=1),
    max_levels_per_side: int = Query(5, ge=1, le=20),
    min_confluence: int = Query(0, ge=0, le=100),
):
    def _build_overlays() -> dict:
        try:
            report = run_analysis(symbol, tf, since=history)
            df = load_ohlcv(symbol, tf, since=history)
        except ValueError as e:
            raise HTTPException(404, str(e))
        if df.empty:
            raise HTTPException(404, f"No data for {symbol}/{tf}")

        show_projection = report.confluence_score >= min_confluence
        projection = (
            build_projection(df, tf, report.trend, report.trade_setup, bars=projection_bars)
            if show_projection
            else None
        )
        ema = build_ema_series(df)

        trade_setup = None
        if report.trade_setup and show_projection:
            ts = report.trade_setup
            trade_setup = {
                "entry": ts.entry,
                "stop_loss": ts.stop_loss,
                "take_profit": ts.take_profit,
                "risk_reward": ts.risk_reward,
                "direction": ts.direction,
            }

        filtered_levels = filter_levels(
            report.levels,
            min_strength=min_level_strength,
            max_per_type=max_levels_per_side,
        )

        return {
            "symbol": symbol,
            "tf": tf,
            "trend": report.trend,
            "confluence_score": report.confluence_score,
            "projection": projection,
            "ema": ema,
            "levels": [
                {"price": lv.price, "type": lv.level_type, "strength": lv.strength}
                for lv in filtered_levels
            ],
            "trade_setup": trade_setup,
        }

    return await asyncio.to_thread(_build_overlays)


@router.get("/analysis/{symbol}/operational-setup")
async def get_operational_setup(
    symbol: str,
    tf: str = Query("4h"),
    history: HistoryParam = Query("5y"),
):
    """Return an exhaustive operational trade setup: probabilities, ETA, evidence and risk."""
    try:
        return await asyncio.to_thread(_build_operational_setup_response, symbol, tf, history)
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(500, f"Operational setup failed: {e}")


@router.get("/analysis/{symbol}/patterns/all")
async def get_all_patterns(
    symbol: str,
    tf: str = Query("4h"),
    history: HistoryParam = Query("5y"),
):
    """Return status of all ~80 patterns (active/recent/inactive) — not just last-bar active."""

    def _build() -> dict:
        report = run_analysis(symbol, tf, since=history)

        result = []
        for p in report.patterns:
            result.append(
                {
                    "id": p.pattern_id,
                    "name": p.name,
                    "category": p.category,
                    "status": p.status,
                    "direction": p.direction,
                    "last_occurrence_bars_ago": p.bars_since
                    if p.bars_since is not None and p.bars_since >= 0
                    else None,
                    "occurrences_last_100_bars": p.occurrences_100,
                    "description": p.description,
                }
            )

        return {
            "symbol": symbol,
            "tf": tf,
            "total_patterns": len(result),
            "active": sum(1 for r in result if r["status"] == "active"),
            "recent": sum(1 for r in result if r["status"] == "recent"),
            "inactive": sum(1 for r in result if r["status"] == "inactive"),
            "patterns": result,
        }

    try:
        return await asyncio.to_thread(_build)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.post("/analysis/{symbol}/refresh")
async def refresh_analysis(symbol: str, tf: str = Query("4h")):
    job_id = q.enqueue("analyze", {"symbol": symbol, "tf": tf})
    job = q.get(job_id)
    if job:
        return job
    return {"id": job_id, "kind": "analyze", "status": "pending", "created_at": None}
