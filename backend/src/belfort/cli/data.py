"""belfort data — OHLCV data management commands."""

from __future__ import annotations

import typer
from rich.console import Console
from rich.table import Table

app = typer.Typer(help="Manage OHLCV data cache.", no_args_is_help=True)
console = Console()


@app.command("fetch")
def fetch(
    symbol: str = typer.Argument("BTCUSDT"),
    tf: str = typer.Option("4h", "--tf", help="Timeframe: 1h, 4h, 1D, 1W"),
    since: str = typer.Option("2y", "--since", help="Lookback period: 2y, 6m, 90d"),
    refresh: bool = typer.Option(False, "--refresh/--no-refresh", help="Refresh recent candles"),
):
    """Fetch and cache OHLCV data from Binance."""
    from belfort.data.loader import load

    console.print(f"Fetching [bold]{symbol}[/] [{tf}] since={since} …")
    with console.status("Downloading…"):
        df = load(symbol, tf, since=since, refresh=refresh)

    if df.empty:
        console.print("[red]No data returned.[/]")
        raise typer.Exit(1)

    console.print(
        f"[green]Done.[/] {len(df)} candles — "
        f"from [bold]{df['time'].min()}[/] to [bold]{df['time'].max()}[/]"
    )


@app.command("inspect")
def inspect(
    symbol: str = typer.Argument("BTCUSDT"),
    tf: str = typer.Option("4h", "--tf"),
    tail: int = typer.Option(5, "--tail"),
):
    """Show last N candles from the cache."""
    from belfort.data.cache import load

    df = load(symbol, tf)
    if df is None or df.empty:
        console.print(f"[yellow]No cached data for {symbol}/{tf}.[/]")
        raise typer.Exit(1)

    table = Table(title=f"{symbol} {tf} (last {tail} bars)")
    for col in ["time", "open", "high", "low", "close", "volume"]:
        table.add_column(col)

    for _, row in df.tail(tail).iterrows():
        table.add_row(*[str(round(row[c], 4)) if isinstance(row[c], float) else str(row[c]) for c in ["time", "open", "high", "low", "close", "volume"]])

    console.print(table)
    console.print(f"Total cached rows: [bold]{len(df)}[/]")
