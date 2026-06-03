"""Tests: CLI commands run without error (using Typer test runner)."""

from __future__ import annotations

from typer.testing import CliRunner

from belfort.cli.__main__ import app

runner = CliRunner()


def test_help():
    result = runner.invoke(app, ["--help"])
    assert result.exit_code == 0
    assert "belfort" in result.output.lower()


def test_doctor():
    result = runner.invoke(app, ["doctor"])
    assert result.exit_code == 0
    assert "TA-Lib" in result.output or "pandas-ta" in result.output


def test_patterns_list():
    result = runner.invoke(app, ["patterns", "list"])
    assert result.exit_code == 0


def test_patterns_list_json():
    result = runner.invoke(app, ["patterns", "list", "--json"])
    assert result.exit_code == 0
    import json
    data = json.loads(result.output)
    assert isinstance(data, list)
    assert len(data) > 0


def test_patterns_list_category_candles():
    result = runner.invoke(app, ["patterns", "list", "--category", "candles"])
    assert result.exit_code == 0


def test_patterns_describe_unknown():
    result = runner.invoke(app, ["patterns", "describe", "does_not_exist_xyz"])
    assert result.exit_code != 0
