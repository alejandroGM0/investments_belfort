import json
from pathlib import Path

import httpx
import pytest

from belfort.news.cache import clear_cache
from belfort.news.service import NoTokenError, get_news

FIXTURE = Path(__file__).parent / "fixtures" / "cryptopanic_posts.json"


@pytest.fixture(autouse=True)
def _clear_news_cache():
    clear_cache()
    yield
    clear_cache()


@pytest.fixture
def cp_payload():
    return json.loads(FIXTURE.read_text())


@pytest.mark.asyncio
async def test_get_news_success(httpx_mock, monkeypatch, cp_payload):
    monkeypatch.setattr("belfort.config.CRYPTOPANIC_API_TOKEN", "test-token")
    httpx_mock.add_response(json=cp_payload)

    async with httpx.AsyncClient() as client:
        result = await get_news(client, "BTC", limit=10, use_cache=False)

    assert result.symbol == "BTC"
    assert len(result.items) == 2
    assert result.summary.positive >= 1
    assert result.summary.negative >= 1


@pytest.mark.asyncio
async def test_get_news_filter_positive(httpx_mock, monkeypatch, cp_payload):
    monkeypatch.setattr("belfort.config.CRYPTOPANIC_API_TOKEN", "test-token")
    httpx_mock.add_response(json=cp_payload)

    async with httpx.AsyncClient() as client:
        result = await get_news(
            client, "BTC", limit=10, sentiment="positive", use_cache=False
        )

    assert all(i.tone == "positive" for i in result.items)


@pytest.mark.asyncio
async def test_get_news_no_token(monkeypatch):
    monkeypatch.setattr("belfort.config.CRYPTOPANIC_API_TOKEN", "")
    async with httpx.AsyncClient() as client:
        with pytest.raises(NoTokenError):
            await get_news(client, "BTC", use_cache=False)
