"""Tests: FastAPI endpoints return correct shape (against OpenAPI schema structure)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from belfort.api.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_jobs_unknown_id():
    response = client.get("/jobs/does-not-exist-abc")
    assert response.status_code == 404


def test_ticker_returns_live_price():
    response = client.get("/ticker/BTCUSDT")
    assert response.status_code == 200
    data = response.json()
    assert data["price"] > 0
    assert "updated_at" in data


def test_backtest_runs_returns_structure():
    response = client.get("/backtest/BTCUSDT/runs?tf=4h&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "runs" in data
    assert "total" in data
    assert isinstance(data["runs"], list)


def test_backtest_returns_structure():
    """Backtest endpoint returns valid structure even with no results."""
    response = client.get("/backtest/BTCUSDT?tf=4h")
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert "win_rate" in data["metrics"]
    assert "total_trades" in data["metrics"]
    assert "status" in data
    assert data["status"] in ("empty", "running", "ready")
    assert "run_summary" in data
    assert "active_job" in data
    assert "last_job" in data


def test_refresh_analysis_returns_job_id():
    """POST /analysis/{symbol}/refresh enqueues a job."""
    response = client.post("/analysis/BTCUSDT/refresh?tf=4h")
    assert response.status_code == 200
    data = response.json()
    assert "job_id" in data
    assert data["status"] == "queued"

    # The job should now be retrievable
    job_id = data["job_id"]
    job_resp = client.get(f"/jobs/{job_id}")
    assert job_resp.status_code == 200
    assert job_resp.json()["id"] == job_id


def test_refresh_backtest_returns_job_id():
    response = client.post("/backtest/BTCUSDT/refresh?tf=4h")
    assert response.status_code == 200
    data = response.json()
    assert data.get("id") or data.get("job_id")
