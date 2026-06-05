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
_write_conn: duckdb.DuckDBPyConnection | None = None
_write_conn_path: str | None = None
_read_conn: duckdb.DuckDBPyConnection | None = None
_read_conn_path: str | None = None


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
            avg_win       DOUBLE DEFAULT 0,
            avg_loss      DOUBLE DEFAULT 0,
            expectancy    DOUBLE DEFAULT 0,
            total_return  DOUBLE DEFAULT 0,
            loss_rate     DOUBLE DEFAULT 0,
            equity_curve_json VARCHAR,
            run_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (pattern_id, symbol, tf, params_hash)
        )
    """)
    for col in ("avg_win", "avg_loss", "expectancy", "total_return", "loss_rate"):
        try:
            conn.execute(f"ALTER TABLE backtest_runs ADD COLUMN IF NOT EXISTS {col} DOUBLE DEFAULT 0")
        except Exception:
            pass


def _get_write_conn() -> duckdb.DuckDBPyConnection:
    """Read-write connection (used by backtest worker for upserts)."""
    global _write_conn, _write_conn_path
    target = str(config.DB_PATH)
    if _write_conn is None or _write_conn_path != target:
        config.ensure_dirs()
        _write_conn = duckdb.connect(target)
        _write_conn_path = target
        _init(_write_conn)
    return _write_conn


def _get_read_conn() -> duckdb.DuckDBPyConnection | None:
    """
    Return a connection for reads. Reuses the write connection when it is
    already open on the same file (DuckDB forbids mixing read_only and
    read-write on one path in the same process). Otherwise opens read_only.
    """
    global _read_conn, _read_conn_path, _write_conn, _write_conn_path
    target = str(config.DB_PATH)
    if not Path(target).exists():
        return None
    if _write_conn is not None and _write_conn_path == target:
        return _write_conn
    if _read_conn is None or _read_conn_path != target:
        try:
            _read_conn = duckdb.connect(target, read_only=True)
            _read_conn_path = target
        except duckdb.IOException:
            return None
    return _read_conn


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
        conn = _get_write_conn()
        conn.execute("""
            INSERT OR REPLACE INTO backtest_runs
              (pattern_id, symbol, tf, params_hash, params_json,
               win_rate, profit_factor, sharpe, max_drawdown,
               total_trades, avg_return, avg_win, avg_loss, expectancy,
               total_return, loss_rate, equity_curve_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [
            pattern_id, symbol, tf, params_hash, params_json,
            metrics.get("win_rate", 0.0),
            metrics.get("profit_factor", 0.0),
            metrics.get("sharpe", 0.0),
            metrics.get("max_drawdown", 0.0),
            metrics.get("total_trades", 0),
            metrics.get("avg_return", 0.0),
            metrics.get("avg_win", 0.0),
            metrics.get("avg_loss", 0.0),
            metrics.get("expectancy", 0.0),
            metrics.get("total_return", 0.0),
            metrics.get("loss_rate", 0.0),
            curve_json,
        ])


def best_run(pattern_id: str, symbol: str, tf: str) -> dict | None:
    """Return the grid combo with highest Sharpe for this pattern."""
    conn = _get_read_conn()
    if conn is None:
        return None
    row = conn.execute("""
        SELECT win_rate, profit_factor, sharpe, max_drawdown,
               total_trades, avg_return, equity_curve_json, params_json
        FROM backtest_runs
        WHERE pattern_id = ? AND symbol = ? AND tf = ?
        ORDER BY sharpe DESC
        LIMIT 1
    """, [pattern_id, symbol, tf]).fetchone()

    if row is None or len(row) < 8:
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
    conn = _get_read_conn()
    if conn is None:
        return {}
    try:
        df = conn.execute("""
            SELECT pattern_id, MAX(win_rate) AS best_win_rate
            FROM backtest_runs
            WHERE symbol = ? AND tf = ?
            GROUP BY pattern_id
        """, [symbol, tf]).fetchdf()
    except Exception:
        return {}

    if df is None or df.empty:
        return {}

    result: dict[str, float] = {}
    for _, row in df.iterrows():
        pid = row.get("pattern_id")
        wr = row.get("best_win_rate")
        if pid is not None and wr is not None:
            try:
                result[str(pid)] = float(wr)
            except (TypeError, ValueError):
                continue
    return result


def top_runs(symbol: str, tf: str, n: int = 20, sort_by: str = "sharpe") -> list[dict]:
    """Return top-n best performing pattern runs."""
    conn = _get_read_conn()
    if conn is None:
        return []

    valid_sort = {"sharpe", "win_rate", "profit_factor"}
    col = sort_by if sort_by in valid_sort else "sharpe"
    try:
        rows = conn.execute(f"""
            SELECT pattern_id, params_json, win_rate, profit_factor, sharpe,
                   max_drawdown, total_trades, avg_return, equity_curve_json, run_at,
                   avg_win, avg_loss, expectancy, total_return, loss_rate, params_hash
            FROM (
                SELECT *, ROW_NUMBER() OVER (PARTITION BY pattern_id ORDER BY {col} DESC) rn
                FROM backtest_runs
                WHERE symbol = ? AND tf = ?
            ) sub
            WHERE rn = 1
            ORDER BY {col} DESC
            LIMIT ?
        """, [symbol, tf, n]).fetchall()
    except Exception:
        try:
            rows = conn.execute(f"""
                SELECT pattern_id, params_json, win_rate, profit_factor, sharpe,
                       max_drawdown, total_trades, avg_return, equity_curve_json, run_at
                FROM (
                    SELECT *, ROW_NUMBER() OVER (PARTITION BY pattern_id ORDER BY {col} DESC) rn
                    FROM backtest_runs
                    WHERE symbol = ? AND tf = ?
                ) sub
                WHERE rn = 1
                ORDER BY {col} DESC
                LIMIT ?
            """, [symbol, tf, n]).fetchall()
        except Exception:
            return []

    results = []
    for r in rows:
        if r is None or len(r) < 8:
            continue
        equity_json = r[8] if len(r) > 8 else "[]"
        run_at = r[9] if len(r) > 9 else None
        curve = json.loads(equity_json or "[]")
        total_ret = float(r[13]) if len(r) > 13 and r[13] is not None else 0.0
        if not total_ret and curve:
            try:
                total_ret = float(curve[-1]["value"]) - 1.0
            except (KeyError, TypeError, ValueError, IndexError):
                total_ret = 0.0
        entry: dict = {
            "pattern_id": r[0],
            "params": json.loads(r[1]),
            "win_rate": r[2],
            "profit_factor": r[3],
            "sharpe": r[4],
            "max_drawdown": r[5],
            "total_trades": r[6],
            "avg_return": r[7],
            "equity_curve": curve,
            "run_at": run_at.isoformat() if hasattr(run_at, "isoformat") else str(run_at) if run_at else None,
            "total_return": total_ret,
            "avg_win": float(r[10]) if len(r) > 10 and r[10] is not None else 0.0,
            "avg_loss": float(r[11]) if len(r) > 11 and r[11] is not None else 0.0,
            "expectancy": float(r[12]) if len(r) > 12 and r[12] is not None else 0.0,
            "loss_rate": float(r[14]) if len(r) > 14 and r[14] is not None else 0.0,
            "params_hash": str(r[15]) if len(r) > 15 else None,
        }
        results.append(entry)
    return results


def list_runs(
    symbol: str,
    tf: str,
    *,
    pattern_id: str | None = None,
    sort_by: str = "sharpe",
    limit: int = 200,
    offset: int = 0,
) -> tuple[list[dict], int]:
    """Return paginated backtest combos and total count."""
    conn = _get_read_conn()
    if conn is None:
        return [], 0

    valid_sort = {"sharpe", "win_rate", "profit_factor", "total_return", "total_trades", "run_at"}
    col = sort_by if sort_by in valid_sort else "sharpe"
    where = "WHERE symbol = ? AND tf = ?"
    params: list = [symbol, tf]
    if pattern_id:
        where += " AND pattern_id = ?"
        params.append(pattern_id)

    try:
        count_row = conn.execute(
            f"SELECT COUNT(*) FROM backtest_runs {where}",
            params,
        ).fetchone()
        total = int(count_row[0]) if count_row else 0

        rows = conn.execute(
            f"""
            SELECT pattern_id, params_json, params_hash,
                   win_rate, profit_factor, sharpe, max_drawdown,
                   total_trades, avg_return, equity_curve_json, run_at,
                   avg_win, avg_loss, expectancy, total_return, loss_rate
            FROM backtest_runs
            {where}
            ORDER BY {col} DESC NULLS LAST
            LIMIT ? OFFSET ?
            """,
            [*params, limit, offset],
        ).fetchall()
    except Exception:
        try:
            rows = conn.execute(
                f"""
                SELECT pattern_id, params_json, params_hash,
                       win_rate, profit_factor, sharpe, max_drawdown,
                       total_trades, avg_return, equity_curve_json, run_at
                FROM backtest_runs
                {where}
                ORDER BY {col} DESC
                LIMIT ? OFFSET ?
                """,
                [*params, limit, offset],
            ).fetchall()
            count_row = conn.execute(
                f"SELECT COUNT(*) FROM backtest_runs {where}",
                params,
            ).fetchone()
            total = int(count_row[0]) if count_row else 0
        except Exception:
            return [], 0

    results: list[dict] = []
    for r in rows:
        if r is None or len(r) < 10:
            continue
        curve = json.loads(r[9] or "[]")
        run_at = r[10]
        total_ret = float(r[14]) if len(r) > 14 and r[14] is not None else 0.0
        if not total_ret and curve:
            try:
                total_ret = float(curve[-1]["value"]) - 1.0
            except (KeyError, TypeError, ValueError, IndexError):
                total_ret = 0.0
        results.append({
            "pattern_id": r[0],
            "params": json.loads(r[1] or "{}"),
            "params_hash": r[2],
            "win_rate": r[3],
            "profit_factor": r[4],
            "sharpe": r[5],
            "max_drawdown": r[6],
            "total_trades": r[7],
            "avg_return": r[8],
            "equity_curve": curve,
            "run_at": run_at.isoformat() if hasattr(run_at, "isoformat") else str(run_at) if run_at else None,
            "avg_win": float(r[11]) if len(r) > 11 and r[11] is not None else 0.0,
            "avg_loss": float(r[12]) if len(r) > 12 and r[12] is not None else 0.0,
            "expectancy": float(r[13]) if len(r) > 13 and r[13] is not None else 0.0,
            "total_return": total_ret,
            "loss_rate": float(r[15]) if len(r) > 15 and r[15] is not None else 0.0,
        })
    return results, total


def has_any_results(symbol: str, tf: str) -> bool:
    conn = _get_read_conn()
    if conn is None:
        return False
    try:
        row = conn.execute(
            "SELECT COUNT(*) FROM backtest_runs WHERE symbol = ? AND tf = ?",
            [symbol, tf],
        ).fetchone()
        return row is not None and row[0] > 0
    except Exception:
        return False


def run_stats(symbol: str, tf: str) -> dict:
    """Aggregate stats for all saved backtest combos for symbol/tf."""
    conn = _get_read_conn()
    if conn is None:
        return {
            "last_run_at": None,
            "patterns_with_results": 0,
            "total_combos_saved": 0,
        }
    try:
        row = conn.execute(
            """
            SELECT MAX(run_at),
                   COUNT(DISTINCT pattern_id),
                   COUNT(*)
            FROM backtest_runs
            WHERE symbol = ? AND tf = ?
            """,
            [symbol, tf],
        ).fetchone()
    except Exception:
        return {
            "last_run_at": None,
            "patterns_with_results": 0,
            "total_combos_saved": 0,
        }

    if row is None or len(row) < 3:
        return {
            "last_run_at": None,
            "patterns_with_results": 0,
            "total_combos_saved": 0,
        }

    last_run = row[0]
    return {
        "last_run_at": last_run.isoformat() if hasattr(last_run, "isoformat") else str(last_run) if last_run else None,
        "patterns_with_results": int(row[1] or 0),
        "total_combos_saved": int(row[2] or 0),
    }
