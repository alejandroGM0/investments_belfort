"""
Chart figure patterns: Head & Shoulders, triangles, flags, wedges, double tops/bottoms.

Uses the chart_patterns library when available; falls back to a lightweight
scipy/numpy implementation for the most critical patterns.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.signal import find_peaks  # type: ignore[import]

from belfort.patterns.registry import PatternSpec, register

# Try chart_patterns library
try:
    from chart_patterns.chart_patterns.head_and_shoulders import find_head_and_shoulders
    from chart_patterns.chart_patterns.triangles import find_triangle_pattern
    from chart_patterns.chart_patterns.doubles import find_double_pattern
    _CP_AVAILABLE = True
except Exception:
    _CP_AVAILABLE = False


# ---------------------------------------------------------------------------
# Head & Shoulders (bullish reversal → bearish signal = -1)
# ---------------------------------------------------------------------------
def _detect_hs(df: pd.DataFrame) -> pd.Series:
    sig = pd.Series(0, index=df.index)
    if len(df) < 40:
        return sig
    if _CP_AVAILABLE:
        try:
            result = find_head_and_shoulders(df.copy())
            col = "head_shoulder_pattern" if "head_shoulder_pattern" in result.columns else None
            if col:
                sig[result[col] == "Head and Shoulder"] = -1
                sig[result[col] == "Inverse Head and Shoulder"] = 1
            return sig
        except Exception:
            pass
    # Fallback: three-peak detection
    peaks, _ = find_peaks(df["high"].to_numpy(float), distance=5)
    if len(peaks) < 3:
        return sig
    for i in range(len(peaks) - 2):
        l, m, r = peaks[i], peaks[i + 1], peaks[i + 2]
        hl, hm, hr = df["high"].iloc[l], df["high"].iloc[m], df["high"].iloc[r]
        if hm > hl and hm > hr and abs(hl - hr) / hm < 0.05:
            sig.iloc[r] = -1  # bearish H&S complete
    return sig


# ---------------------------------------------------------------------------
# Inverse H&S (bearish reversal → bullish signal = +1)
# ---------------------------------------------------------------------------
def _detect_ihs(df: pd.DataFrame) -> pd.Series:
    sig = pd.Series(0, index=df.index)
    if len(df) < 40:
        return sig
    _, troughs = find_peaks(-df["low"].to_numpy(float), distance=5), None
    troughs, _ = find_peaks(-df["low"].to_numpy(float), distance=5)
    if len(troughs) < 3:
        return sig
    for i in range(len(troughs) - 2):
        l, m, r = troughs[i], troughs[i + 1], troughs[i + 2]
        ll, lm, lr = df["low"].iloc[l], df["low"].iloc[m], df["low"].iloc[r]
        if lm < ll and lm < lr and abs(ll - lr) / max(abs(ll), 1e-9) < 0.05:
            sig.iloc[r] = 1
    return sig


# ---------------------------------------------------------------------------
# Double Top (-1) / Double Bottom (+1)
# ---------------------------------------------------------------------------
def _detect_double_top(df: pd.DataFrame) -> pd.Series:
    sig = pd.Series(0, index=df.index)
    if len(df) < 20:
        return sig
    if _CP_AVAILABLE:
        try:
            result = find_double_pattern(df.copy())
            col = [c for c in result.columns if "double" in c.lower()]
            if col:
                sig[result[col[0]] == "Double Top"] = -1
                sig[result[col[0]] == "Double Bottom"] = 1
            return sig
        except Exception:
            pass
    peaks, _ = find_peaks(df["high"].to_numpy(float), distance=10)
    for i in range(len(peaks) - 1):
        h1, h2 = df["high"].iloc[peaks[i]], df["high"].iloc[peaks[i + 1]]
        if abs(h1 - h2) / max(h1, 1e-9) < 0.03:
            sig.iloc[peaks[i + 1]] = -1
    return sig


def _detect_double_bottom(df: pd.DataFrame) -> pd.Series:
    sig = pd.Series(0, index=df.index)
    if len(df) < 20:
        return sig
    troughs, _ = find_peaks(-df["low"].to_numpy(float), distance=10)
    for i in range(len(troughs) - 1):
        l1, l2 = df["low"].iloc[troughs[i]], df["low"].iloc[troughs[i + 1]]
        if abs(l1 - l2) / max(abs(l1), 1e-9) < 0.03:
            sig.iloc[troughs[i + 1]] = 1
    return sig


# ---------------------------------------------------------------------------
# Ascending Triangle (+1 bias)
# ---------------------------------------------------------------------------
def _detect_asc_triangle(df: pd.DataFrame) -> pd.Series:
    sig = pd.Series(0, index=df.index)
    if len(df) < 30:
        return sig
    if _CP_AVAILABLE:
        try:
            result = find_triangle_pattern(df.copy(), triangle_type="ascending")
            col = [c for c in result.columns if "triangle" in c.lower()]
            if col:
                mask = result[col[0]].notna() & (result[col[0]] != 0)
                sig[mask] = 1
            return sig
        except Exception:
            pass
    peaks, _ = find_peaks(df["high"].to_numpy(float), distance=5)
    troughs, _ = find_peaks(-df["low"].to_numpy(float), distance=5)
    if len(peaks) >= 2 and len(troughs) >= 2:
        highs = df["high"].iloc[peaks].values
        lows = df["low"].iloc[troughs].values
        if abs(highs[-1] - highs[-2]) / max(highs[-2], 1e-9) < 0.02 and lows[-1] > lows[-2]:
            sig.iloc[-1] = 1
    return sig


# ---------------------------------------------------------------------------
# Descending Triangle (-1 bias)
# ---------------------------------------------------------------------------
def _detect_desc_triangle(df: pd.DataFrame) -> pd.Series:
    sig = pd.Series(0, index=df.index)
    if len(df) < 30:
        return sig
    if _CP_AVAILABLE:
        try:
            result = find_triangle_pattern(df.copy(), triangle_type="descending")
            col = [c for c in result.columns if "triangle" in c.lower()]
            if col:
                mask = result[col[0]].notna() & (result[col[0]] != 0)
                sig[mask] = -1
            return sig
        except Exception:
            pass
    peaks, _ = find_peaks(df["high"].to_numpy(float), distance=5)
    troughs, _ = find_peaks(-df["low"].to_numpy(float), distance=5)
    if len(peaks) >= 2 and len(troughs) >= 2:
        highs = df["high"].iloc[peaks].values
        lows = df["low"].iloc[troughs].values
        if highs[-1] < highs[-2] and abs(lows[-1] - lows[-2]) / max(abs(lows[-2]), 1e-9) < 0.02:
            sig.iloc[-1] = -1
    return sig


# ---------------------------------------------------------------------------
# Symmetrical Triangle (neutral bias; direction TBD from breakout)
# ---------------------------------------------------------------------------
def _detect_sym_triangle(df: pd.DataFrame) -> pd.Series:
    sig = pd.Series(0, index=df.index)
    if len(df) < 30:
        return sig
    if _CP_AVAILABLE:
        try:
            result = find_triangle_pattern(df.copy(), triangle_type="symmetrical")
            col = [c for c in result.columns if "triangle" in c.lower()]
            if col:
                mask = result[col[0]].notna() & (result[col[0]] != 0)
                sig[mask] = 1  # mark as potential breakout
            return sig
        except Exception:
            pass
    peaks, _ = find_peaks(df["high"].to_numpy(float), distance=5)
    troughs, _ = find_peaks(-df["low"].to_numpy(float), distance=5)
    if len(peaks) >= 2 and len(troughs) >= 2:
        highs = df["high"].iloc[peaks].values
        lows = df["low"].iloc[troughs].values
        if highs[-1] < highs[-2] and lows[-1] > lows[-2]:
            sig.iloc[-1] = 1
    return sig


# ---------------------------------------------------------------------------
# Bull Flag (+1)
# ---------------------------------------------------------------------------
def _detect_bull_flag(df: pd.DataFrame) -> pd.Series:
    sig = pd.Series(0, index=df.index)
    if len(df) < 20:
        return sig
    closes = df["close"].to_numpy(float)
    for i in range(10, len(closes)):
        segment = closes[i - 10 : i]
        pole = closes[i - 10 : i - 5]
        flag = closes[i - 5 : i]
        if len(pole) < 2 or len(flag) < 2:
            continue
        pole_ret = (pole[-1] - pole[0]) / max(abs(pole[0]), 1e-9)
        flag_ret = (flag[-1] - flag[0]) / max(abs(flag[0]), 1e-9)
        if pole_ret > 0.03 and -0.03 < flag_ret < 0:
            sig[i] = 1
    return sig


# ---------------------------------------------------------------------------
# Bear Flag (-1)
# ---------------------------------------------------------------------------
def _detect_bear_flag(df: pd.DataFrame) -> pd.Series:
    sig = pd.Series(0, index=df.index)
    if len(df) < 20:
        return sig
    closes = df["close"].to_numpy(float)
    for i in range(10, len(closes)):
        pole = closes[i - 10 : i - 5]
        flag = closes[i - 5 : i]
        if len(pole) < 2 or len(flag) < 2:
            continue
        pole_ret = (pole[-1] - pole[0]) / max(abs(pole[0]), 1e-9)
        flag_ret = (flag[-1] - flag[0]) / max(abs(flag[0]), 1e-9)
        if pole_ret < -0.03 and 0 < flag_ret < 0.03:
            sig[i] = -1
    return sig


# ---------------------------------------------------------------------------
# Register all
# ---------------------------------------------------------------------------
_FIGURES = [
    ("fig_hs",             "Head & Shoulders",          "chart_patterns", _detect_hs,           ["reversal", "bearish"]),
    ("fig_ihs",            "Inverse Head & Shoulders",  "chart_patterns", _detect_ihs,          ["reversal", "bullish"]),
    ("fig_double_top",     "Double Top",                "chart_patterns", _detect_double_top,   ["reversal", "bearish"]),
    ("fig_double_bottom",  "Double Bottom",             "chart_patterns", _detect_double_bottom,["reversal", "bullish"]),
    ("fig_asc_triangle",   "Ascending Triangle",        "chart_patterns", _detect_asc_triangle, ["continuation", "bullish"]),
    ("fig_desc_triangle",  "Descending Triangle",       "chart_patterns", _detect_desc_triangle,["continuation", "bearish"]),
    ("fig_sym_triangle",   "Symmetrical Triangle",      "chart_patterns", _detect_sym_triangle, ["neutral", "breakout"]),
    ("fig_bull_flag",      "Bull Flag",                 "chart_patterns", _detect_bull_flag,    ["continuation", "bullish"]),
    ("fig_bear_flag",      "Bear Flag",                 "chart_patterns", _detect_bear_flag,    ["continuation", "bearish"]),
]

for _pid, _name, _cat, _fn, _tags in _FIGURES:
    register(PatternSpec(
        id=_pid,
        name=_name,
        category=_cat,  # type: ignore[arg-type]
        detect=_fn,
        backtestable=True,
        description=f"Chart figure: {_name}",
        tags=["chart_figure"] + _tags,
    ))
