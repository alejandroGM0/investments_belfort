"""Tests: API endpoints for init, patterns/all, jobs, and new features."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from belfort.api.main import app

client = TestClient(app)


# ------------------------------------------------------------------
# /symbols/{symbol}/init
# ------------------------------------------------------------------

class TestInitEndpoint:
    def test_init_returns_job_ids(self):
        response = client.post("/symbols/BTCUSDT/init?tf=4h&history=5y")
        assert response.status_code == 200
        data = response.json()
        assert "data_job_id" in data
        assert "backtest_job_id" in data
        assert data["status"] == "queued"
        assert data["symbol"] == "BTCUSDT"
        assert data["history"] == "5y"

    def test_init_with_max_history(self):
        response = client.post("/symbols/ETHUSDT/init?history=max")
        assert response.status_code == 200
        data = response.json()
        assert data["history"] == "max"

    def test_init_job_ids_are_valid(self):
        response = client.post("/symbols/BTCUSDT/init")
        data = response.json()
        # Both job IDs should be retrievable
        for key in ("data_job_id", "backtest_job_id"):
            job_id = data[key]
            job_resp = client.get(f"/jobs/{job_id}")
            assert job_resp.status_code == 200
            assert job_resp.json()["id"] == job_id

    def test_init_creates_correct_job_kinds(self):
        response = client.post("/symbols/BTCUSDT/init")
        data = response.json()
        data_job = client.get(f"/jobs/{data['data_job_id']}").json()
        bt_job = client.get(f"/jobs/{data['backtest_job_id']}").json()
        assert data_job["kind"] == "data_fetch"
        assert bt_job["kind"] == "backtest_quick"


# ------------------------------------------------------------------
# /jobs/{job_id} and /jobs
# ------------------------------------------------------------------

class TestJobEndpoints:
    def test_get_job_not_found(self):
        response = client.get("/jobs/does-not-exist-abc")
        assert response.status_code == 404

    def test_list_jobs_empty(self):
        # Note: previous tests may have created jobs, so just check shape
        response = client.get("/jobs?limit=1")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_list_jobs_with_limit(self):
        # Create a few jobs
        for _ in range(3):
            client.post("/analysis/BTCUSDT/refresh?tf=4h")
        response = client.get("/jobs?limit=2")
        assert response.status_code == 200
        assert len(response.json()) <= 2

    def test_job_has_progress_fields(self):
        """Jobs should include progress tracking fields."""
        resp = client.post("/analysis/BTCUSDT/refresh?tf=4h")
        job_id = resp.json()["job_id"]
        job = client.get(f"/jobs/{job_id}").json()
        assert "progress_current" in job
        assert "progress_total" in job
        assert "progress_message" in job


# ------------------------------------------------------------------
# /backtest/{symbol}/refresh with mode
# ------------------------------------------------------------------

class TestBacktestRefresh:
    def test_refresh_quick_mode(self):
        response = client.post("/backtest/BTCUSDT/refresh?mode=quick")
        assert response.status_code == 200
        data = response.json()
        assert data["mode"] == "quick"
        job = client.get(f"/jobs/{data['job_id']}").json()
        assert job["kind"] == "backtest_quick"

    def test_refresh_full_mode(self):
        response = client.post("/backtest/BTCUSDT/refresh?mode=full")
        assert response.status_code == 200
        data = response.json()
        assert data["mode"] == "full"
        job = client.get(f"/jobs/{data['job_id']}").json()
        assert job["kind"] == "backtest"

    def test_refresh_default_mode_is_quick(self):
        response = client.post("/backtest/BTCUSDT/refresh")
        data = response.json()
        assert data["mode"] == "quick"


# ------------------------------------------------------------------
# /backtest/{symbol}
# ------------------------------------------------------------------

class TestBacktestGet:
    def test_returns_structure(self):
        response = client.get("/backtest/BTCUSDT?tf=4h")
        assert response.status_code == 200
        data = response.json()
        assert "metrics" in data
        assert "win_rate" in data["metrics"]
        assert "total_trades" in data["metrics"]

    def test_empty_results_has_note(self):
        """When no backtest results, should include a helpful note."""
        response = client.get("/backtest/NEWCOIN_NEVER_TESTED?tf=4h")
        assert response.status_code == 200
        data = response.json()
        if data["metrics"]["total_trades"] == 0:
            assert "note" in data


# ------------------------------------------------------------------
# /analysis/{symbol}/refresh
# ------------------------------------------------------------------

class TestAnalysisRefresh:
    def test_refresh_returns_job_id(self):
        response = client.post("/analysis/BTCUSDT/refresh?tf=4h")
        assert response.status_code == 200
        data = response.json()
        assert "job_id" in data
        assert data["status"] == "queued"


# ------------------------------------------------------------------
# Health
# ------------------------------------------------------------------

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
