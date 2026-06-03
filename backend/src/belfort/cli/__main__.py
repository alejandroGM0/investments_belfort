"""belfort — crypto investment analysis CLI."""

import typer

from belfort.cli import analyze, backtest, data, patterns, serve

app = typer.Typer(
    name="belfort",
    help="Crypto investment analysis engine: TA patterns, backtest, API server.",
    no_args_is_help=True,
)

app.add_typer(data.app, name="data")
app.add_typer(patterns.app, name="patterns")
app.add_typer(analyze.app, name="analyze")
app.add_typer(backtest.app, name="backtest")
app.add_typer(serve.app, name="serve")


@app.command()
def doctor():
    """Check that all dependencies are available and data directories exist."""
    from rich.console import Console
    from rich.table import Table
    from belfort import config

    console = Console()
    table = Table(title="Belfort dependency check")
    table.add_column("Component")
    table.add_column("Status")

    # TA-Lib
    try:
        import talib
        import numpy as np
        dummy = np.ones(10)
        talib.RSI(dummy, timeperiod=5)
        table.add_row("TA-Lib", "[green]OK[/]")
    except ImportError:
        table.add_row("TA-Lib", "[yellow]Not installed — using pandas-ta fallback[/]")
    except Exception as e:
        table.add_row("TA-Lib", f"[red]ERROR: {e}[/]")

    # pandas-ta-classic
    try:
        import pandas_ta  # noqa: F401
        table.add_row("pandas-ta-classic", "[green]OK[/]")
    except ImportError:
        table.add_row("pandas-ta-classic", "[red]Not installed[/]")

    # VectorBT
    try:
        import vectorbt  # noqa: F401
        table.add_row("VectorBT", "[green]OK[/]")
    except Exception:
        table.add_row("VectorBT", "[yellow]Not installed — fallback backtest active[/]")

    # DuckDB
    try:
        import duckdb  # noqa: F401
        table.add_row("DuckDB", "[green]OK[/]")
    except ImportError:
        table.add_row("DuckDB", "[red]Not installed[/]")

    # ccxt
    try:
        import ccxt  # noqa: F401
        table.add_row("ccxt", "[green]OK[/]")
    except ImportError:
        table.add_row("ccxt", "[red]Not installed[/]")

    # Data dirs
    config.ensure_dirs()
    table.add_row("Data dir", f"[green]{config.DATA_DIR}[/]")
    table.add_row("DB path", f"[green]{config.DB_PATH}[/]")

    console.print(table)


@app.command()
def worker():
    """Start the background job worker (polls SQLite queue)."""
    from belfort.jobs.worker import run_forever
    run_forever()


if __name__ == "__main__":
    app()
