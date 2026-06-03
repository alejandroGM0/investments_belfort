import json
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from belfort.api.routes import news as news_routes

FIXTURE = Path(__file__).parent / "fixtures" / "newsapi_articles.json"


@asynccontextmanager
async def _lifespan(app: FastAPI):
    async with httpx.AsyncClient() as client:
        app.state.http_client = client
        yield


@pytest.fixture
def client():
    app = FastAPI(lifespan=_lifespan)
    app.include_router(news_routes.router)
    with TestClient(app) as c:
        yield c


def test_news_no_token(client, monkeypatch):
    monkeypatch.setattr("belfort.config.NEWSAPI_API_KEY", "")
    monkeypatch.setattr("belfort.config.CRYPTOPANIC_API_TOKEN", "")
    r = client.get("/news/BTC")
    assert r.status_code == 503


def test_news_success(client, monkeypatch, httpx_mock):
    monkeypatch.setattr("belfort.config.NEWSAPI_API_KEY", "test-token")
    monkeypatch.setattr("belfort.config.CRYPTOPANIC_API_TOKEN", "")
    from belfort.news.cache import clear_cache

    clear_cache()
    payload = json.loads(FIXTURE.read_text())
    httpx_mock.add_response(json=payload)

    r = client.get("/news/BTC?limit=5&sentiment=all")
    assert r.status_code == 200
    body = r.json()
    assert body["symbol"] == "BTC"
    assert len(body["items"]) == 2
    assert body["summary"]["positive"] >= 1
