"""Optional LunarCrush API v4 adapter."""

from __future__ import annotations

import httpx

from belfort import config
from belfort.sentiment.models import SocialNetwork
from belfort.sentiment.symbols import SymbolConfig


def fetch_lunarcrush_network(cfg: SymbolConfig) -> SocialNetwork | None:
    if not config.LUNARCRUSH_API_KEY:
        return None

    url = f"https://lunarcrush.com/api4/public/topic/{cfg.lunarcrush_topic}/v1"
    headers = {"Authorization": f"Bearer {config.LUNARCRUSH_API_KEY}"}

    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.get(url, headers=headers)
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return None

    payload = data.get("data", data)
    if isinstance(payload, list) and payload:
        payload = payload[0]

    sentiment = payload.get("sentiment")
    if sentiment is None:
        return None

    score = float(sentiment)
    if abs(score) <= 1:
        score = score * 100

    mentions = int(payload.get("num_posts") or payload.get("posts") or 0)
    return SocialNetwork(name="LunarCrush", score=round(score, 1), mentions=mentions)
