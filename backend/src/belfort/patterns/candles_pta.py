"""
pandas-ta-classic candlestick patterns.

Used in two roles:
1. Fallback when TA-Lib is not installed (registers the same CDL pattern IDs).
2. Extra patterns not in TA-Lib (spinning top variants, inside bar, etc.).

Only registers patterns whose id is NOT already in the registry (avoids
duplication when TA-Lib is present).
"""

from __future__ import annotations

import numpy as np
import pandas as pd

try:
    import pandas_ta as pta  # pandas-ta-classic

    PTA_AVAILABLE = True
except ImportError:
    PTA_AVAILABLE = False

from belfort.patterns.registry import REGISTRY, PatternSpec, register

if not PTA_AVAILABLE:
    pass  # nothing to register
else:
    def _already(pid: str) -> bool:
        return any(s.id == pid for s in REGISTRY)

    def _cdl_detect(cdl_name: str):
        def detect(df: pd.DataFrame) -> pd.Series:
            result = df.ta.cdl_pattern(name=cdl_name)
            if result is None or result.empty:
                return pd.Series(0, index=df.index)
            col = result.columns[0]
            raw = result[col].fillna(0)
            return pd.Series(np.sign(raw).astype(int), index=df.index)
        return detect

    _PTA_PATTERNS: list[tuple[str, str, str]] = [
        # (pandas_ta cdl name, registry id, human name)
        ("doji",           "cdl_doji",           "Doji"),
        ("engulfing",      "cdl_engulfing",       "Engulfing"),
        ("hammer",         "cdl_hammer",          "Hammer"),
        ("shooting_star",  "cdl_shootingstar",    "Shooting Star"),
        ("morning_star",   "cdl_morningstar",     "Morning Star"),
        ("evening_star",   "cdl_eveningstar",     "Evening Star"),
        ("harami",         "cdl_harami",          "Harami"),
        ("marubozu",       "cdl_marubozu",        "Marubozu"),
        ("spinning_top",   "cdl_spinningtop",     "Spinning Top"),
        ("inverted_hammer","cdl_invertedhammer",  "Inverted Hammer"),
        ("hanging_man",    "cdl_hangingman",      "Hanging Man"),
        ("piercing",       "cdl_piercing",        "Piercing"),
        ("dark_cloud_cover","cdl_darkcloudcover", "Dark Cloud Cover"),
        ("three_white_soldiers","cdl_3whitesoldiers","Three White Soldiers"),
        ("three_black_crows","cdl_3blackcrows",   "Three Black Crows"),
        ("tweezers",       "cdl_tweezers",        "Tweezers"),
        ("inside",         "cdl_inside",          "Inside Bar"),
    ]

    for _cdl, _pid, _name in _PTA_PATTERNS:
        if _already(_pid):
            continue
        register(
            PatternSpec(
                id=_pid,
                name=_name,
                category="candles",
                detect=_cdl_detect(_cdl),
                backtestable=True,
                description=f"pandas-ta-classic cdl_pattern('{_cdl}')",
                tags=["pandas-ta", "candlestick", "fallback"],
            )
        )
