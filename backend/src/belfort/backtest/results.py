"""
Convenience wrappers around storage.db for backtest results.
Re-exports the most-used functions so callers import from here.
"""

from belfort.storage.db import (
    upsert_run,
    best_run,
    all_win_rates,
    top_runs,
    has_any_results,
)

__all__ = ["upsert_run", "best_run", "all_win_rates", "top_runs", "has_any_results"]
