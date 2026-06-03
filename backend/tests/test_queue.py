"""Tests: job queue with progress tracking."""

from __future__ import annotations

import json
import pytest

from belfort.jobs import queue as q


@pytest.fixture(autouse=True)
def _clean_db(tmp_path, monkeypatch):
    """Use a temp DB for each test."""
    monkeypatch.setattr("belfort.config.JOBS_DB_PATH", tmp_path / "test_jobs.db")
    monkeypatch.setattr("belfort.config.DATA_DIR", tmp_path)


def test_enqueue_returns_uuid():
    job_id = q.enqueue("test_kind", {"symbol": "BTCUSDT"})
    assert isinstance(job_id, str)
    assert len(job_id) == 36  # UUID format


def test_enqueue_and_get():
    job_id = q.enqueue("data_fetch", {"symbol": "ETHUSDT", "tf": "1h"})
    job = q.get(job_id)
    assert job is not None
    assert job["id"] == job_id
    assert job["kind"] == "data_fetch"
    assert job["status"] == "pending"
    assert job["payload"]["symbol"] == "ETHUSDT"
    assert job["progress_current"] == 0
    assert job["progress_total"] == 0
    assert job["progress_message"] == ""


def test_get_unknown_returns_none():
    assert q.get("nonexistent-id-xyz") is None


def test_peek_next_returns_oldest_pending():
    q.enqueue("first", {"n": 1})
    q.enqueue("second", {"n": 2})
    job = q.peek_next()
    assert job is not None
    assert job["kind"] == "first"


def test_peek_next_empty_returns_none():
    assert q.peek_next() is None


def test_claim_sets_running():
    job_id = q.enqueue("analyze", {"symbol": "BTCUSDT"})
    q.claim(job_id)
    job = q.get(job_id)
    assert job["status"] == "running"
    assert job["started_at"] is not None


def test_complete_sets_done():
    job_id = q.enqueue("analyze", {"symbol": "BTCUSDT"})
    q.claim(job_id)
    q.complete(job_id, {"patterns": 10})
    job = q.get(job_id)
    assert job["status"] == "done"
    assert job["finished_at"] is not None
    assert job["result"]["patterns"] == 10


def test_fail_sets_failed():
    job_id = q.enqueue("backtest", {"symbol": "BTCUSDT"})
    q.claim(job_id)
    q.fail(job_id, "something went wrong")
    job = q.get(job_id)
    assert job["status"] == "failed"
    assert "something went wrong" in job["result"]["error"]


def test_update_progress():
    job_id = q.enqueue("backtest", {"symbol": "BTCUSDT"})
    q.claim(job_id)
    q.update_progress(job_id, 5, 20, "Pattern: cdl_hammer")
    job = q.get(job_id)
    assert job["progress_current"] == 5
    assert job["progress_total"] == 20
    assert job["progress_message"] == "Pattern: cdl_hammer"


def test_update_progress_multiple_times():
    job_id = q.enqueue("backtest", {"symbol": "BTCUSDT"})
    q.claim(job_id)
    for i in range(1, 11):
        q.update_progress(job_id, i, 10, f"Step {i}")
    job = q.get(job_id)
    assert job["progress_current"] == 10
    assert job["progress_total"] == 10
    assert job["progress_message"] == "Step 10"


def test_list_recent_empty():
    result = q.list_recent()
    assert isinstance(result, list)
    assert len(result) == 0


def test_list_recent_returns_jobs():
    ids = [q.enqueue(f"kind_{i}", {"i": i}) for i in range(5)]
    jobs = q.list_recent()
    assert len(jobs) == 5
    # Newest first
    returned_ids = [j["id"] for j in jobs]
    assert returned_ids == list(reversed(ids))


def test_list_recent_limit():
    for i in range(10):
        q.enqueue(f"kind_{i}", {"i": i})
    jobs = q.list_recent(limit=3)
    assert len(jobs) == 3


def test_completed_job_not_in_peek():
    job_id = q.enqueue("analyze", {"symbol": "BTCUSDT"})
    q.claim(job_id)
    q.complete(job_id, {"ok": True})
    assert q.peek_next() is None


def test_failed_job_not_in_peek():
    job_id = q.enqueue("analyze", {"symbol": "BTCUSDT"})
    q.claim(job_id)
    q.fail(job_id, "err")
    assert q.peek_next() is None


def test_result_deserialization():
    """Result should be properly deserialized from JSON."""
    job_id = q.enqueue("test", {"x": [1, 2, 3]})
    q.claim(job_id)
    q.complete(job_id, {"nested": {"data": [1, 2, 3]}})
    job = q.get(job_id)
    assert job["result"]["nested"]["data"] == [1, 2, 3]
    assert job["payload"]["x"] == [1, 2, 3]
