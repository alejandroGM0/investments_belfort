"""
TA-Lib CDL* candlestick patterns — 61 patterns registered.

Each TA-Lib function returns an array of integers:
  +100 (bullish), -100 (bearish), 0 (no pattern).
We normalise to +1 / -1 / 0.

If TA-Lib is not installed the module falls through to candles_pta.py
(the registry loader does not raise in that case).
"""

from __future__ import annotations

import numpy as np
import pandas as pd

try:
    import talib as _talib

    _AVAILABLE = True
except ImportError:
    _AVAILABLE = False

from belfort.patterns.registry import PatternSpec, register

if not _AVAILABLE:
    # Nothing to register here; candles_pta.py will cover these patterns
    pass
else:
    # ------------------------------------------------------------------
    # Helper
    # ------------------------------------------------------------------
    def _wrap(fn, **kwargs):
        """Return a detect() callable around a TA-Lib CDL function."""
        def detect(df: pd.DataFrame) -> pd.Series:
            o = df["open"].to_numpy(dtype=float)
            h = df["high"].to_numpy(dtype=float)
            lo = df["low"].to_numpy(dtype=float)
            c = df["close"].to_numpy(dtype=float)
            raw = fn(o, h, lo, c, **kwargs)
            normalised = np.sign(raw).astype(int)
            return pd.Series(normalised, index=df.index)
        return detect

    # ------------------------------------------------------------------
    # All 61 TA-Lib CDL patterns
    # ------------------------------------------------------------------
    _PATTERNS: list[tuple[str, str, str]] = [
        # (talib_fn_name, pattern_id, human_name)
        ("CDLABANDONEDBABY",     "cdl_abandonedbaby",     "Abandoned Baby"),
        ("CDLADVANCEBLOCK",      "cdl_advanceblock",      "Advance Block"),
        ("CDLBELTHOLD",          "cdl_belthold",          "Belt-hold"),
        ("CDLBREAKAWAY",         "cdl_breakaway",         "Breakaway"),
        ("CDLCLOSINGMARUBOZU",   "cdl_closingmarubozu",   "Closing Marubozu"),
        ("CDLCONCEALBABYSWALL",  "cdl_concealbabyswall",  "Concealing Baby Swallow"),
        ("CDLCOUNTERATTACK",     "cdl_counterattack",     "Counterattack"),
        ("CDLDARKCLOUDCOVER",    "cdl_darkcloudcover",    "Dark Cloud Cover"),
        ("CDLDOJI",              "cdl_doji",              "Doji"),
        ("CDLDOJISTAR",          "cdl_dojistar",          "Doji Star"),
        ("CDLDRAGONFLYDOJI",     "cdl_dragonflydoji",     "Dragonfly Doji"),
        ("CDLENGULFING",         "cdl_engulfing",         "Engulfing"),
        ("CDLEVENINGDOJISTAR",   "cdl_eveningdojistar",   "Evening Doji Star"),
        ("CDLEVENINGSTAR",       "cdl_eveningstar",       "Evening Star"),
        ("CDLGAPSIDESIDEWHITE",  "cdl_gapsidesidewhite",  "Up/Down-gap Side-by-side White Lines"),
        ("CDLGRAVESTONEDOJI",    "cdl_gravestonedoji",    "Gravestone Doji"),
        ("CDLHAMMER",            "cdl_hammer",            "Hammer"),
        ("CDLHANGINGMAN",        "cdl_hangingman",        "Hanging Man"),
        ("CDLHARAMI",            "cdl_harami",            "Harami"),
        ("CDLHARAMICROSS",       "cdl_haramicross",       "Harami Cross"),
        ("CDLHIGHWAVE",          "cdl_highwave",          "High-Wave Candle"),
        ("CDLHIKKAKE",           "cdl_hikkake",           "Hikkake"),
        ("CDLHIKKAKEMOD",        "cdl_hikkakemod",        "Modified Hikkake"),
        ("CDLHOMINGPIGEON",      "cdl_homingpigeon",      "Homing Pigeon"),
        ("CDLIDENTICAL3CROWS",   "cdl_identical3crows",   "Identical Three Crows"),
        ("CDLINNECK",            "cdl_inneck",            "In-Neck"),
        ("CDLINVERTEDHAMMER",    "cdl_invertedhammer",    "Inverted Hammer"),
        ("CDLKICKING",           "cdl_kicking",           "Kicking"),
        ("CDLKICKINGBYLENGTH",   "cdl_kickingbylength",   "Kicking (by length)"),
        ("CDLLADDERBOTTOM",      "cdl_ladderbottom",      "Ladder Bottom"),
        ("CDLLONGLEGGEDDOJI",    "cdl_longleggeddoji",    "Long Legged Doji"),
        ("CDLLONGLINE",          "cdl_longline",          "Long Line Candle"),
        ("CDLMARUBOZU",          "cdl_marubozu",          "Marubozu"),
        ("CDLMATCHINGLOW",       "cdl_matchinglow",       "Matching Low"),
        ("CDLMATHOLD",           "cdl_mathold",           "Mat Hold"),
        ("CDLMORNINGDOJISTAR",   "cdl_morningdojistar",   "Morning Doji Star"),
        ("CDLMORNINGSTAR",       "cdl_morningstar",       "Morning Star"),
        ("CDLONNECK",            "cdl_onneck",            "On-Neck"),
        ("CDLPIERCING",          "cdl_piercing",          "Piercing"),
        ("CDLRICKSHAWMAN",       "cdl_rickshawman",       "Rickshaw Man"),
        ("CDLRISEFALL3METHODS",  "cdl_risefall3methods",  "Rising/Falling Three Methods"),
        ("CDLSEPARATINGLINES",   "cdl_separatinglines",   "Separating Lines"),
        ("CDLSHOOTINGSTAR",      "cdl_shootingstar",      "Shooting Star"),
        ("CDLSHORTLINE",         "cdl_shortline",         "Short Line Candle"),
        ("CDLSPINNINGTOP",       "cdl_spinningtop",       "Spinning Top"),
        ("CDLSTALLEDPATTERN",    "cdl_stalledpattern",    "Stalled Pattern"),
        ("CDLSTICKSANDWICH",     "cdl_sticksandwich",     "Stick Sandwich"),
        ("CDLTAKURI",            "cdl_takuri",            "Takuri"),
        ("CDLTASUKIGAP",         "cdl_tasukigap",         "Tasuki Gap"),
        ("CDLTHRUSTING",         "cdl_thrusting",         "Thrusting"),
        ("CDLTRISTAR",           "cdl_tristar",           "Tristar"),
        ("CDLUNIQUE3RIVER",      "cdl_unique3river",      "Unique 3 River"),
        ("CDLUPSIDEGAP2CROWS",   "cdl_upsidegap2crows",   "Upside Gap Two Crows"),
        ("CDLXSIDEGAP3METHODS",  "cdl_xsidegap3methods",  "Upside/Downside Gap Three Methods"),
        # Additional patterns available in TA-Lib
        ("CDL3BLACKCROWS",       "cdl_3blackcrows",       "Three Black Crows"),
        ("CDL3INSIDE",           "cdl_3inside",           "Three Inside Up/Down"),
        ("CDL3LINESTRIKE",       "cdl_3linestrike",       "Three-Line Strike"),
        ("CDL3OUTSIDE",          "cdl_3outside",          "Three Outside Up/Down"),
        ("CDL3STARSINSOUTH",     "cdl_3starsinsouth",     "Three Stars In The South"),
        ("CDL3WHITESOLDIERS",    "cdl_3whitesoldiers",    "Three Advancing White Soldiers"),
        ("CDL2CROWS",            "cdl_2crows",            "Two Crows"),
    ]

    for _fn_name, _pid, _name in _PATTERNS:
        _fn = getattr(_talib, _fn_name, None)
        if _fn is None:
            continue
        register(
            PatternSpec(
                id=_pid,
                name=_name,
                category="candles",
                detect=_wrap(_fn),
                backtestable=True,
                description=f"TA-Lib {_fn_name}",
                tags=["talib", "candlestick"],
            )
        )
