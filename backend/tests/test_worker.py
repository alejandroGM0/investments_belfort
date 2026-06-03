"""Tests: worker job handler logic (unit tests with mocked dependencies)."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pandas as pd
import pytest

from belfort.jobs.worker import _handle


@pytest.fixture(autouse=True)
def _clean_db(tmp_path, monkeypatch):
    """Use a temp DB for progress updates."""
    monkeypatch.setattr("belfort.config.JOBS_DB_PATH", tmp_path / "test_jobs.db")
    monkeypatch.setattr("belfort.config.DATA_DIR", tmp_path)


def _make_job(kind: str, payload: dict | None = None, job_id: str = "test-job-123") -> dict:
    return {
        "id": job_id,
        "kind": kind,
        "payload": payload or {},
        "status": "running",
    }


class TestHandleDataFetch:
    @patch("belfort.data.loader.load")
    def test_returns_rows_count(self, mock_load):
        mock_load.return_value = pd.DataFrame({"time": range(100)})
        job = _make_job("data_fetch", {"symbol": "BTCUSDT", "tf": "4h"})
        result = _handle(job)
        assert result == {"rows": 100}

    @patch("belfort.data.loader.load")
    def test_passes_history_param(self, mock_load):
        mock_load.return_value = pd.DataFrame({"time": range(50)})
        job = _make_job("data_fetch", {"symbol": "BTCUSDT", "tf": "4h", "history": "max"})
        _handle(job)
        mock_load.assert_called_once_with("BTCUSDT", "4h", since="max", refresh=True)


class TestHandleBacktestQuick:
    @patch("belfort.backtest.grid.run_all_quick")
    @patch("belfort.data.loader.load")
    def test_returns_pattern_count(self, mock_load, mock_quick):
        mock_load.return_value = pd.DataFrame({"time": [1, 2, 3]})
        mock_quick.return_value = {"p1": 1, "p2": 0, "p3": 2}
        job = _make_job("backtest_quick", {"symbol": "BTCUSDT", "tf": "4h"})
        result = _handle(job)
        assert result == {"patterns_run": 3, "combos_saved": 3, "mode": "quick"}

    @patch("belfort.data.loader.load")
    def test_empty_data_returns_error(self, mock_load):
        mock_load.return_value = pd.DataFrame()
        job = _make_job("backtest_quick", {"symbol": "BTCUSDT", "tf": "4h"})
        result = _handle(job)
        assert result == {"error": "no data"}


class TestHandleAnalyze:
    @patch("belfort.analysis.run")
    @patch("belfort.data.loader.load")
    def test_returns_analysis_info(self, mock_load, mock_analysis):
        mock_load.return_value = pd.DataFrame({"time": [1, 2]})
        mock_report = MagicMock()
        mock_report.patterns = [MagicMock()] * 5
        mock_report.trend = "bullish"
        mock_analysis.return_value = mock_report
        job = _make_job("analyze", {"symbol": "BTCUSDT", "tf": "4h"})
        result = _handle(job)
        assert result["patterns_detected"] == 5
        assert result["trend"] == "bullish"

    @patch("belfort.analysis.run")
    @patch("belfort.data.loader.load")
    def test_passes_history_to_loader(self, mock_load, mock_analysis):
        mock_load.return_value = pd.DataFrame({"time": [1]})
        mock_report = MagicMock()
        mock_report.patterns = []
        mock_report.trend = "neutral"
        mock_analysis.return_value = mock_report
        job = _make_job("analyze", {"symbol": "BTCUSDT", "tf": "4h", "history": "max"})
        _handle(job)
        # First call should have refresh=True and since="max"
        mock_load.assert_called_once_with("BTCUSDT", "4h", since="max", refresh=True)


class TestHandleUnknown:
    def test_unknown_kind_returns_error(self):
        job = _make_job("completely_unknown", {})
        result = _handle(job)
        assert "error" in result
        assert "unknown" in result["error"]
