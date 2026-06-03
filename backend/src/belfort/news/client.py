"""Async httpx client for CryptoPanic API."""

from __future__ import annotations

import httpx

from belfort import config
from belfort.news.models import CpPostsResponse


class CryptoPanicClient:
    def __init__(self, client: httpx.AsyncClient, token: str | None = None) -> None:
        self._client = client
        self._token = token or config.CRYPTOPANIC_API_TOKEN

    async def fetch_posts(
        self,
        currency: str,
        *,
        limit: int = 20,
        kind: str = "news",
    ) -> CpPostsResponse:
        if not self._token:
            raise ValueError("CRYPTOPANIC_API_TOKEN is not configured")

        params = {
            "auth_token": self._token,
            "currencies": currency,
            "public": "true",
            "kind": kind,
        }
        url = f"{config.CRYPTOPANIC_BASE_URL.rstrip('/')}/posts/"
        resp = await self._client.get(url, params=params, timeout=30.0)
        resp.raise_for_status()
        data = resp.json()
        posts = CpPostsResponse.model_validate(data)
        if limit > 0 and len(posts.results) > limit:
            posts.results = posts.results[:limit]
        return posts
