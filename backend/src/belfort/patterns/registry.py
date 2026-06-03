"""
Unified pattern registry.

Every pattern source (TA-Lib CDL*, chart figures, structure, SMC) registers
a PatternSpec into REGISTRY.  The rest of the engine iterates REGISTRY without
knowing which library produced the detection.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Literal

import pandas as pd

PatternCategory = Literal["candles", "chart_patterns", "structure", "indicators", "levels"]


@dataclass
class PatternSpec:
    id: str
    name: str
    category: PatternCategory
    detect: Callable[[pd.DataFrame], pd.Series]
    """
    detect(df) -> Series indexed like df.
    Values:  1 (bullish), -1 (bearish), 0 (none).
    """
    backtestable: bool = True
    description: str = ""
    tags: list[str] = field(default_factory=list)


# Global registry — populated by candles_talib / candles_pta / chart_figures / structure
REGISTRY: list[PatternSpec] = []


def register(spec: PatternSpec) -> None:
    REGISTRY.append(spec)


def get(pattern_id: str) -> PatternSpec | None:
    for s in REGISTRY:
        if s.id == pattern_id:
            return s
    return None


def by_category(category: PatternCategory) -> list[PatternSpec]:
    return [s for s in REGISTRY if s.category == category]


def all_backtestable() -> list[PatternSpec]:
    return [s for s in REGISTRY if s.backtestable]


def _load_all() -> None:
    """Import all source modules so they self-register into REGISTRY."""
    from belfort.patterns import (  # noqa: F401
        candles_talib,
        candles_pta,
        chart_figures,
        structure,
        levels,
        smc,
    )


# Auto-load on first import of registry
_load_all()
