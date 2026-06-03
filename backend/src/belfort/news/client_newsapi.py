"""Async client for NewsAPI.org."""

from __future__ import annotations

import httpx

from belfort import config
from belfort.news.models import NaArticlesResponse


class NewsApiClient:
    def __init__(self, client: httpx.AsyncClient, api_key: str | None = None) -> None:
        self._client = client
        self._api_key = api_key or config.NEWSAPI_API_KEY

    async def fetch_everything(
        self,
        query: str,
        *,
        limit: int = 20,
        language: str = "en",
    ) -> NaArticlesResponse:
        if not self._api_key:
            raise ValueError("NEWSAPI_API_KEY is not configured")

        params = {
            "q": query,
            "language": language,
            "sortBy": "publishedAt",
            "pageSize": min(max(limit, 1), 100),
            "apiKey": self._api_key,
        }
        url = f"{config.NEWSAPI_BASE_URL.rstrip('/')}/everything"
        resp = await self._client.get(url, params=params, timeout=30.0)
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") != "ok":
            raise ValueError(f"NewsAPI error: {data.get('code', '')} {data.get('message', data)}")
        parsed = NaArticlesResponse.model_validate(data)
        if limit > 0 and len(parsed.articles) > limit:
            parsed.articles = parsed.articles[:limit]
        return parsed
