from __future__ import annotations

import os
from datetime import datetime, timezone

from fastapi import APIRouter, Query

from belfort.analysis import run as run_analysis
from belfort.data.loader import load
from belfort.sentiment.service import NoDataSourcesError, get_sentiment
from belfort.symbols import display_symbol, normalize_symbol
from belfort.storage.db import top_runs

router = APIRouter()

_DEFAULT_RANKING = (
    "BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT,ADAUSDT,AVAXUSDT,DOTUSDT,MATICUSDT,LINKUSDT"
)


def _ranking_symbols(symbols_param: str | None) -> list[str]:
    if symbols_param:
        return [normalize_symbol(s) for s in symbols_param.split(",") if s.strip()]
    raw = os.getenv("BELFORT_RANKING_SYMBOLS", _DEFAULT_RANKING)
    return [normalize_symbol(s) for s in raw.split(",") if s.strip()]


@router.get("/ranking")
async def get_ranking(
    tf: str = Query("4h"),
    symbols: str | None = Query(None),
):
    items: list[dict] = []
    for sym in _ranking_symbols(symbols):
        try:
            report = run_analysis(sym, tf)
            confluence = report.confluence_score
            trend = report.trend
            active_patterns = len(report.patterns)
        except Exception:
            continue

        sentiment_score: float | None = None
        news_tone: str | None = None
        try:
            sent = get_sentiment(display_symbol(sym), window="24h")
            sentiment_score = float(sent.score)
            tone = sent.tone
            if tone in ("positive", "negative", "neutral", "mixed"):
                news_tone = tone
        except (NoDataSourcesError, Exception):
            pass

        price: float | None = None
        price_change_24h: float | None = None
        df = load(sym, tf)
        if df is not None and not df.empty:
            last = float(df.iloc[-1]["close"])
            price = last
            if len(df) >= 7:
                prev = float(df.iloc[-7]["close"])
                if prev:
                    price_change_24h = round((last - prev) / prev * 100, 2)

        win_rate: float | None = None
        try:
            rows = top_runs(sym, tf, n=1, sort_by="sharpe")
            if rows:
                win_rate = float(rows[0]["win_rate"])
        except Exception:
            pass

        items.append(
            {
                "symbol": display_symbol(sym),
                "confluence_score": confluence,
                "trend": trend,
                "active_patterns": active_patterns,
                "sentiment_score": sentiment_score,
                "news_tone": news_tone,
                "win_rate": win_rate,
                "price": price,
                "price_change_24h": price_change_24h,
            }
        )

    items.sort(key=lambda x: x["confluence_score"], reverse=True)
    for i, row in enumerate(items, start=1):
        row["rank"] = i

    return {
        "tf": tf,
        "items": items,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
