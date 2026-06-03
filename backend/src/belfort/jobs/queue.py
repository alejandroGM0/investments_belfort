"""
SQLite-backed lightweight job queue (no Redis required).

Schema: jobs(id TEXT PK, kind TEXT, payload TEXT, status TEXT,
             created_at TEXT, started_at TEXT, finished_at TEXT, result TEXT,
             progress_current INTEGER, progress_total INTEGER, progress_message TEXT)
"""

from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from belfort import config

_lock = threading.Lock()


def _db() -> sqlite3.Connection:
    config.ensure_dirs()
    conn = sqlite3.connect(str(config.JOBS_DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id           TEXT PRIMARY KEY,
            kind         TEXT NOT NULL,
            payload      TEXT NOT NULL,
            status       TEXT NOT NULL DEFAULT 'pending',
            created_at   TEXT NOT NULL,
            started_at   TEXT,
            finished_at  TEXT,
            result       TEXT,
            progress_current INTEGER DEFAULT 0,
            progress_total   INTEGER DEFAULT 0,
            progress_message TEXT DEFAULT ''
        )
    """)
    # Migrate old tables: add columns if missing
    try:
        conn.execute("ALTER TABLE jobs ADD COLUMN progress_current INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute("ALTER TABLE jobs ADD COLUMN progress_total INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute("ALTER TABLE jobs ADD COLUMN progress_message TEXT DEFAULT ''")
    except sqlite3.OperationalError:
        pass
    conn.commit()
    return conn


def enqueue(kind: str, payload: dict) -> str:
    """Create a new job and return its id."""
    job_id = str(uuid.uuid4())
    now = datetime.now(tz=timezone.utc).isoformat()
    with _lock:
        conn = _db()
        conn.execute(
            "INSERT INTO jobs (id, kind, payload, status, created_at) VALUES (?,?,?,?,?)",
            [job_id, kind, json.dumps(payload), "pending", now],
        )
        conn.commit()
        conn.close()
    return job_id


def peek_next() -> dict | None:
    """Return the oldest pending job without changing its status."""
    with _lock:
        conn = _db()
        row = conn.execute(
            "SELECT * FROM jobs WHERE status='pending' ORDER BY created_at LIMIT 1"
        ).fetchone()
        conn.close()
    if row is None:
        return None
    d = dict(row)
    d["payload"] = json.loads(d["payload"] or "{}")
    d["result"] = json.loads(d["result"] or "null")
    return d


def claim(job_id: str) -> None:
    now = datetime.now(tz=timezone.utc).isoformat()
    with _lock:
        conn = _db()
        conn.execute(
            "UPDATE jobs SET status='running', started_at=? WHERE id=?",
            [now, job_id],
        )
        conn.commit()
        conn.close()


def complete(job_id: str, result: Any = None) -> None:
    now = datetime.now(tz=timezone.utc).isoformat()
    with _lock:
        conn = _db()
        conn.execute(
            "UPDATE jobs SET status='done', finished_at=?, result=? WHERE id=?",
            [now, json.dumps(result), job_id],
        )
        conn.commit()
        conn.close()


def fail(job_id: str, error: str) -> None:
    now = datetime.now(tz=timezone.utc).isoformat()
    with _lock:
        conn = _db()
        conn.execute(
            "UPDATE jobs SET status='failed', finished_at=?, result=? WHERE id=?",
            [now, json.dumps({"error": error}), job_id],
        )
        conn.commit()
        conn.close()


def update_progress(job_id: str, current: int, total: int, message: str = "") -> None:
    """Update progress on a running job (called by handlers during execution)."""
    with _lock:
        conn = _db()
        conn.execute(
            "UPDATE jobs SET progress_current=?, progress_total=?, progress_message=? WHERE id=?",
            [current, total, message, job_id],
        )
        conn.commit()
        conn.close()


def get(job_id: str) -> dict | None:
    with _lock:
        conn = _db()
        row = conn.execute("SELECT * FROM jobs WHERE id=?", [job_id]).fetchone()
        conn.close()
    if row is None:
        return None
    d = dict(row)
    d["payload"] = json.loads(d["payload"] or "{}")
    d["result"] = json.loads(d["result"] or "null")
    return d


def list_recent(limit: int = 20) -> list[dict]:
    """Return the most recent jobs (newest first)."""
    with _lock:
        conn = _db()
        rows = conn.execute(
            "SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?", [limit]
        ).fetchall()
        conn.close()
    result = []
    for row in rows:
        d = dict(row)
        d["payload"] = json.loads(d["payload"] or "{}")
        d["result"] = json.loads(d["result"] or "null")
        result.append(d)
    return result


_BACKTEST_KINDS = ("backtest", "backtest_quick")


def _row_to_job(row) -> dict:
    d = dict(row)
    d["payload"] = json.loads(d["payload"] or "{}")
    d["result"] = json.loads(d["result"] or "null")
    return d


def find_backtest_job(
    symbol: str,
    tf: str,
    *,
    active: bool = False,
) -> dict | None:
    """
    Find a backtest job for symbol/tf.

    active=True  → pending or running (most recent)
    active=False → last finished job (done or failed)
    """
    with _lock:
        conn = _db()
        if active:
            row = conn.execute(
                """
                SELECT * FROM jobs
                WHERE kind IN ('backtest', 'backtest_quick')
                  AND status IN ('pending', 'running')
                  AND json_extract(payload, '$.symbol') = ?
                  AND json_extract(payload, '$.tf') = ?
                ORDER BY created_at DESC
                LIMIT 1
                """,
                [symbol, tf],
            ).fetchone()
        else:
            row = conn.execute(
                """
                SELECT * FROM jobs
                WHERE kind IN ('backtest', 'backtest_quick')
                  AND status IN ('done', 'failed')
                  AND json_extract(payload, '$.symbol') = ?
                  AND json_extract(payload, '$.tf') = ?
                ORDER BY finished_at DESC
                LIMIT 1
                """,
                [symbol, tf],
            ).fetchone()
        conn.close()
    return _row_to_job(row) if row else None


def job_to_summary(job: dict | None) -> dict | None:
    """Public-facing job summary for API responses."""
    if job is None:
        return None
    kind = job.get("kind", "")
    mode = "full" if kind == "backtest" else "quick"
    return {
        "id": job["id"],
        "kind": kind,
        "mode": mode,
        "status": job["status"],
        "created_at": job.get("created_at"),
        "started_at": job.get("started_at"),
        "finished_at": job.get("finished_at"),
        "progress_current": job.get("progress_current") or 0,
        "progress_total": job.get("progress_total") or 0,
        "progress_message": job.get("progress_message") or "",
        "result": job.get("result"),
    }
