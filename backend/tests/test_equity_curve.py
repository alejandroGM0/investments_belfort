"""Tests for equity curve enrichment (legacy DB rows)."""

from belfort.backtest.engine import ensure_equity_curve, _infer_total_return


def test_ensure_curve_from_legacy_single_point():
    metrics = {
        "total_trades": 54,
        "avg_return": 0.018,
        "profit_factor": 2.85,
        "total_return": 0.0,
    }
    curve = ensure_equity_curve([{"date": "0", "value": 1.0}], metrics)
    assert len(curve) >= 2
    assert curve[-1]["value"] > 1.0


def test_infer_total_return_from_avg_return():
    tr = _infer_total_return({"total_trades": 10, "avg_return": 0.02, "total_return": 0})
    assert tr == 0.2
