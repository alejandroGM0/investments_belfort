"""Optional Santiment sanpy adapter."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from belfort import config
from belfort.sentiment.models import SocialNetwork
from belfort.sentiment.symbols import SymbolConfig


def fetch_santiment_network(cfg: SymbolConfig) -> SocialNetwork | None:
    if not config.SANBASE_API_KEY:
        return None

    try:
        import san

        san.ApiConfig.api_key = config.SANBASE_API_KEY
        from_date = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")
        to_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        df = san.get(
            "sentiment_volume_consumed_total",
            slug=cfg.santiment_slug,
            from_date=from_date,
            to_date=to_date,
            interval="1d",
        )
    except Exception:
        try:
            import san

            san.ApiConfig.api_key = config.SANBASE_API_KEY
            from_date = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")
            to_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            df = san.get(
                "social_volume_total",
                slug=cfg.santiment_slug,
                from_date=from_date,
                to_date=to_date,
                interval="1d",
            )
        except Exception:
            return None

    if df is None or df.empty:
        return None

    col = df.columns[0]
    recent = df[col].dropna().tail(7)
    if recent.empty:
        return None

    volume = float(recent.sum())
    mentions = int(volume) if volume > 0 else len(recent)
    score = 0.0
    if len(recent) >= 2:
        change = (recent.iloc[-1] - recent.iloc[0]) / max(recent.iloc[0], 1)
        score = max(-100.0, min(100.0, change * 50))

    return SocialNetwork(name="Santiment", score=round(score, 1), mentions=mentions)
