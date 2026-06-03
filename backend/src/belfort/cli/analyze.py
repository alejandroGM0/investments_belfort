"""belfort analyze — run technical analysis (registered as a direct command in __main__)."""

from __future__ import annotations

import json
from typing import Annotated, Optional

import typer
from rich.console import Console
from rich.table import Table

console = Console()


def analyze(
    symbol: Annotated[str, typer.Argument(help="Symbol, e.g. BTCUSDT")] = "BTCUSDT",
    tf: Annotated[str, typer.Option("--tf", help="Timeframe: 1h, 4h, 1D, 1W")] = "4h",
    since: Annotated[str, typer.Option("--since", help="Lookback if no cache: 2y, 6m, 90d")] = "2y",
    refresh: Annotated[bool, typer.Option("--refresh/--no-refresh", help="Refresh OHLCV from Binance")] = False,
    as_json: Annotated[bool, typer.Option("--json", help="Output raw JSON")] = False,
    category: Annotated[Optional[str], typer.Option("--category", "-c", help="Filter patterns by category")] = None,
):
    """Run the full TA analysis for SYMBOL on timeframe TF."""
    from belfort.analysis import run

    with console.status(f"Analysing {symbol} [{tf}]…"):
        report = run(symbol, tf, since=since, refresh=refresh)

    if as_json:
        from belfort.api.mappers import report_to_analysis_response
        out = report_to_analysis_response(report, 1, 200, category)
        typer.echo(json.dumps(out, indent=2, default=str))
        return

    # --- Summary ---
    trend_color = {"bullish": "green", "bearish": "red", "neutral": "yellow"}[report.trend]
    console.print(
        f"\n[bold]{report.symbol}[/] [{report.tf}] | "
        f"Trend: [{trend_color}]{report.trend.upper()}[/] (strength {report.trend_strength}) | "
        f"Confluence: [bold]{report.confluence_score}/100[/]"
    )

    # --- Active patterns ---
    pats = [p for p in report.patterns if (not category or p.category == category)]
    if pats:
        pt = Table(title=f"Active patterns ({len(pats)})")
        pt.add_column("ID", style="cyan", no_wrap=True)
        pt.add_column("Name")
        pt.add_column("Category", style="magenta")
        pt.add_column("Dir")
        pt.add_column("Conf")
        pt.add_column("★")
        for p in sorted(pats, key=lambda x: x.confidence, reverse=True):
            d_label = "▲ bull" if p.direction == 1 else "▼ bear"
            d_color = "green" if p.direction == 1 else "red"
            star = "★" if p.highlight else ""
            pt.add_row(
                p.pattern_id, p.name, p.category,
                f"[{d_color}]{d_label}[/]",
                f"{p.confidence:.2f}", star,
            )
        console.print(pt)
    else:
        console.print("[yellow]No active patterns detected on the last bar.[/]")

    # --- Key indicators ---
    if report.indicators:
        it = Table(title="Key indicators")
        it.add_column("Indicator")
        it.add_column("Value")
        it.add_column("Signal")
        it.add_column("Zone")
        for ind in report.indicators:
            sig_color = {"bullish": "green", "bearish": "red", "neutral": "yellow"}[ind.signal]
            it.add_row(ind.name, str(ind.value), f"[{sig_color}]{ind.signal}[/]", ind.zone or "")
        console.print(it)

    # --- Trade setup ---
    if report.trade_setup:
        ts = report.trade_setup
        console.print(
            f"\n[bold]Trade setup ({ts.direction}):[/] "
            f"Entry {ts.entry} | SL [red]{ts.stop_loss}[/] | "
            f"TP [green]{ts.take_profit}[/] | R:R [bold]{ts.risk_reward}[/]"
        )

    # --- Multi-TF trend ---
    if report.timeframe_trends:
        console.print("\n[bold]Multi-TF trend:[/]")
        for t, v in report.timeframe_trends.items():
            col = {"bullish": "green", "bearish": "red", "neutral": "yellow"}.get(v["trend"], "white")
            console.print(f"  {t}: [{col}]{v['trend']}[/] (strength {v['strength']})")

    console.print(f"\n[dim]Updated: {report.updated_at}[/]")


# Expose as a Typer app for backward compat (add_typer usage in tests)
app = typer.Typer(help="Run technical analysis.", no_args_is_help=True)
app.command()(analyze)
