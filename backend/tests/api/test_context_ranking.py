"""API tests for ranking and context routes."""

from fastapi.testclient import TestClient

from belfort.api.main import app

client = TestClient(app)


def test_context_returns_real_shape():
    r = client.get("/context/BTC?tf=4h")
    assert r.status_code == 200
    body = r.json()
    assert body["symbol"] == "BTC"
    assert isinstance(body["events"], list)
    assert "correlations" in body
    assert isinstance(body["correlations"], list)


def test_ranking_returns_items_or_empty():
    r = client.get("/ranking?tf=4h&symbols=BTCUSDT")
    assert r.status_code == 200
    body = r.json()
    assert "items" in body
    assert body["tf"] == "4h"
