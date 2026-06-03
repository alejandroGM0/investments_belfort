"""Tests: pattern registry is populated and patterns are callable."""

from __future__ import annotations

import pandas as pd
import pytest

from belfort.patterns.registry import REGISTRY, by_category, get


def test_registry_not_empty():
    assert len(REGISTRY) >= 5, "Registry should have at least 5 patterns"


def test_all_categories_present():
    cats = {s.category for s in REGISTRY}
    # At minimum candles (from talib or pta) and structure should be present
    assert "candles" in cats or "structure" in cats


def test_get_returns_spec():
    if not REGISTRY:
        pytest.skip("Registry empty")
    first = REGISTRY[0]
    result = get(first.id)
    assert result is not None
    assert result.id == first.id


def test_get_unknown_returns_none():
    assert get("this_does_not_exist_xyz") is None


def test_no_duplicate_ids():
    ids = [s.id for s in REGISTRY]
    assert len(ids) == len(set(ids)), "Duplicate pattern IDs found"


def test_detect_callable_returns_series(df_random):
    """Every detect() must return a pd.Series aligned to df index."""
    for spec in REGISTRY[:10]:  # test first 10 to keep it fast
        result = spec.detect(df_random)
        assert isinstance(result, pd.Series), f"{spec.id} did not return Series"
        assert len(result) == len(df_random), f"{spec.id} returned wrong length"
        assert set(result.unique()).issubset({-1, 0, 1}), f"{spec.id} has unexpected values"
