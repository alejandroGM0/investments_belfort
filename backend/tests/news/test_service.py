import json
from pathlib import Path

import httpx
import pytest

from belfort.news.cache import clear_cache
from belfort.news.service import NoTokenError, get_news

CP_FIXTURE = Path(__file__).parent / "fixtures" / "cryptopanic_posts.json"
NA_FIXTURE = Path(__file__).parent / "fixtures" / "newsapi_articles.json"


@pytest.fixture(autouse=True)
def _clear_news_cache():
    clear_cache()
    yield
    clear_cache()


@pytest.fixture
def na_payload():
    return json.loads(NA_FIXTURE.read_text())


@pytest.fixture
def cp_payload():
    return json.loads(CP_FIXTURE.read_text())


@pytest.mark.asyncio
async def test_get_news_newsapi(httpx_mock, monkeypatch, na_payload):
    monkeypatch.setattr("belfort.config.NEWSAPI_API_KEY", "test-newsapi-key")
    monkeypatch.setattr("belfort.config.CRYPTOPANIC_API_TOKEN", "")
    httpx_mock.add_response(json=na_payload)

    async with httpx.AsyncClient() as client:
        result = await get_news(client, "BTC", limit=10, use_cache=False)

    assert result.symbol == "BTC"
    assert len(result.items) == 2
    assert result.items[0].source == "CoinDesk"


@pytest.mark.asyncio
async def test_get_news_filter_positive_newsapi(httpx_mock, monkeypatch, na_payload):
    monkeypatch.setattr("belfort.config.NEWSAPI_API_KEY", "test-newsapi-key")
    monkeypatch.setattr("belfort.config.CRYPTOPANIC_API_TOKEN", "")
    httpx_mock.add_response(json=na_payload)

    async with httpx.AsyncClient() as client:
        result = await get_news(
            client, "BTC", limit=10, sentiment="positive", use_cache=False
        )

    assert all(i.tone == "positive" for i in result.items)


@pytest.mark.asyncio
async def test_get_news_cryptopanic_fallback(httpx_mock, monkeypatch, cp_payload):
    monkeypatch.setattr("belfort.config.NEWSAPI_API_KEY", "")
    monkeypatch.setattr("belfort.config.CRYPTOPANIC_API_TOKEN", "test-cp-token")
    httpx_mock.add_response(json=cp_payload)

    async with httpx.AsyncClient() as client:
        result = await get_news(client, "BTC", limit=10, use_cache=False)

    assert len(result.items) == 2


@pytest.mark.asyncio
async def test_get_news_no_token(monkeypatch):
    monkeypatch.setattr("belfort.config.NEWSAPI_API_KEY", "")
    monkeypatch.setattr("belfort.config.CRYPTOPANIC_API_TOKEN", "")
    async with httpx.AsyncClient() as client:
        with pytest.raises(NoTokenError):
            await get_news(client, "BTC", use_cache=False)
