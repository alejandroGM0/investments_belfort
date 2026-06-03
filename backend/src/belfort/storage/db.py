"""
DuckDB persistence for backtest results.

Schema
------
backtest_runs:
  pattern_id, symbol, tf, params_hash, params_json,
  win_rate, profit_factor, sharpe, max_drawdown,
  total_trades, avg_return, equity_curve_json, run_at
"""

from __future__ import annotations

import json
import threading
from pathlib import Path

import duckdb

from belfort import config

_lock = threading.Lock()
_conn: duckdb.DuckDBPyConnection | None = None


def _get_conn() -> duckdb.DuckDBPyConnection:
    global _conn
    if _conn is None:
        config.ensure_dirs()
        _conn = duckdb.connect(str(config.DB_PATH))
        _init(_conn)
    return _conn


def _init(conn: duckdb.DuckDBPyConnection) -> None:
    conn.execute("""
        CREATE TABLE IF NOT EXISTS backtest_runs (
            pattern_id    VARCHAR,
            symbol        VARCHAR,
            tf            VARCHAR,
            params_hash   VARCHAR,
            params_json   VARCHAR,
            win_rate      DOUBLE,
            profit_factor DOUBLE,
            sharpe        DOUBLE,
            max_drawdown  DOUBLE,
            total_trades  INTEGER,
            avg_return    DOUBLE,
            equity_curve_json VARCHAR,
            run_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (pattern_id, symbol, tf, params_hash)
        )
    """)


def upsert_run(
    pattern_id: str,
    symbol: str,
    tf: str,
    params: dict,
    metrics: dict,
    equity_curve: list[dict] | None = None,
) -> None:
    params_json = json.dumps(params, sort_keys=True)
    params_hash = str(hash(params_json) & 0xFFFFFFFF)
    curve_json = json.dumps(equity_curve or [])

    with _lock:
        conn = _get_conn()
        conn.execute("""
            INSERT OR REPLACE INTO backtest_runs
              (pattern_id, symbol, tf, params_hash, params_json,
               win_rate, profit_factor, sharpe, max_drawdown,
               total_trades, avg_return, equity_curve_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [
            pattern_id, symbol, tf, params_hash, params_json,
            metrics.get("win_rate", 0.0),
            metrics.get("profit_factor", 0.0),
            metrics.get("sharpe", 0.0),
            metrics.get("max_drawdown", 0.0),
            metrics.get("total_trades", 0),
            metrics.get("avg_return", 0.0),
            curve_json,
        ])


def best_run(pattern_id: str, symbol: str, tf: str) -> dict | None:
    """Return the grid combo with highest Sharpe for this pattern."""
    conn = _get_conn()
    row = conn.execute("""
        SELECT win_rate, profit_factor, sharpe, max_drawdown,
               total_trades, avg_return, equity_curve_json, params_json
        FROM backtest_runs
        WHERE pattern_id = ? AND symbol = ? AND tf = ?
        ORDER BY sharpe DESC
        LIMIT 1
    """, [pattern_id, symbol, tf]).fetchone()

    if row is None:
        return None
    return {
        "win_rate": row[0],
        "profit_factor": row[1],
        "sharpe": row[2],
        "max_drawdown": row[3],
        "total_trades": row[4],
        "avg_return": row[5],
        "equity_curve": json.loads(row[6] or "[]"),
        "params": json.loads(row[7] or "{}"),
    }


def all_win_rates(symbol: str, tf: str) -> dict[str, float]:
    """Return {pattern_id: best_win_rate} for the given symbol/tf."""
    conn = _get_conn()
    rows = conn.execute("""
        SELECT pattern_id, MAX(win_rate)
        FROM backtest_runs
        WHERE symbol = ? AND tf = ?
        GROUP BY pattern_id
    """, [symbol, tf]).fetchall()
    return {row[0]: row[1] for row in rows}


def top_runs(symbol: str, tf: str, n: int = 20, sort_by: str = "sharpe") -> list[dict]:
    """Return top-n best performing pattern runs."""
    valid_sort = {"sharpe", "win_rate", "profit_factor"}
    col = sort_by if sort_by in valid_sort else "sharpe"
    conn = _get_conn()
    rows = conn.execute(f"""
        SELECT pattern_id, params_json, win_rate, profit_factor, sharpe,
               max_drawdown, total_trades, avg_return
        FROM (
            SELECT *, ROW_NUMBER() OVER (PARTITION BY pattern_id ORDER BY {col} DESC) rn
            FROM backtest_runs
            WHERE symbol = ? AND tf = ?
        ) sub
        WHERE rn = 1
        ORDER BY {col} DESC
        LIMIT ?
    """, [symbol, tf, n]).fetchall()

    return [
        {
            "pattern_id": r[0],
            "params": json.loads(r[1]),
            "win_rate": r[2],
            "profit_factor": r[3],
            "sharpe": r[4],
            "max_drawdown": r[5],
            "total_trades": r[6],
            "avg_return": r[7],
        }
        for r in rows
    ]


def has_any_results(symbol: str, tf: str) -> bool:
    conn = _get_conn()
    row = conn.execute(
        "SELECT COUNT(*) FROM backtest_runs WHERE symbol = ? AND tf = ?",
        [symbol, tf],
    ).fetchone()
    return row is not None and row[0] > 0
