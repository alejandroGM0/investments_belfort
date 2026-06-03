"""
SQLite-backed lightweight job queue (no Redis required).

Schema: jobs(id TEXT PK, kind TEXT, payload TEXT, status TEXT,
             created_at TEXT, started_at TEXT, finished_at TEXT, result TEXT)
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
            result       TEXT
        )
    """)
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
    return dict(row) if row else None


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
