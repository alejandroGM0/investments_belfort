"""belfort backtest — backtest commands."""

from __future__ import annotations

import json

import typer
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich.table import Table

app = typer.Typer(help="Backtest pattern strategies.", no_args_is_help=True)
console = Console()


@app.command("run")
def run_single(
    symbol: str = typer.Argument("BTCUSDT"),
    tf: str = typer.Option("4h", "--tf"),
    pattern: str = typer.Option("cdl_engulfing", "--pattern", "-p"),
    sl_atr: float = typer.Option(1.5, "--sl-atr"),
    tp_rr: float = typer.Option(2.0, "--tp-rr"),
    filter_trend: str = typer.Option("none", "--filter-trend", help="none|sma200|adx25"),
    filter_rsi: str = typer.Option("none", "--filter-rsi", help="none|oversold|overbought"),
    holding_bars: int | None = typer.Option(50, "--holding-bars"),
    as_json: bool = typer.Option(False, "--json"),
):
    """Run a single pattern backtest with specific parameters."""
    from belfort.analysis import run as run_analysis
    from belfort.backtest.engine import run_single as _run
    from belfort.patterns.registry import get

    spec = get(pattern)
    if spec is None:
        console.print(f"[red]Pattern '{pattern}' not found.[/]")
        raise typer.Exit(1)

    from belfort.data.loader import load
    df = load(symbol, tf)
    if df is None or df.empty:
        console.print("[red]No data. Run: belfort data fetch[/]")
        raise typer.Exit(1)

    from belfort.indicators.compute import compute_all
    df_e = compute_all(df)

    with console.status(f"Backtesting {pattern} on {symbol}/{tf}…"):
        signal = spec.detect(df_e)
        params = {
            "sl_atr": sl_atr, "tp_rr": tp_rr,
            "filter_trend": filter_trend,
            "filter_rsi": filter_rsi,
            "holding_bars_max": holding_bars,
        }
        metrics = _run(df_e, signal, params)

    if as_json:
        typer.echo(json.dumps(metrics, indent=2, default=str))
        return

    table = Table(title=f"Backtest: {pattern} | {symbol} {tf}")
    table.add_column("Metric")
    table.add_column("Value")
    table.add_row("Total trades", str(metrics["total_trades"]))
    table.add_row("Win rate", f"{metrics['win_rate']:.1%}")
    table.add_row("Profit factor", f"{metrics['profit_factor']:.2f}")
    table.add_row("Sharpe", f"{metrics['sharpe']:.2f}")
    table.add_row("Max drawdown", f"{metrics['max_drawdown']:.1%}")
    table.add_row("Avg return", f"{metrics['avg_return']:.2%}")
    console.print(table)


@app.command("grid")
def run_grid(
    symbol: str = typer.Argument("BTCUSDT"),
    tf: str = typer.Option("4h", "--tf"),
    pattern: str = typer.Option("cdl_engulfing", "--pattern", "-p"),
    as_json: bool = typer.Option(False, "--json"),
):
    """Run the full parameter grid for a single pattern."""
    from belfort.backtest.grid import run_pattern, combo_count
    from belfort.data.loader import load

    df = load(symbol, tf)
    if df is None or df.empty:
        console.print("[red]No data. Run: belfort data fetch[/]")
        raise typer.Exit(1)

    n_combos = combo_count()
    console.print(f"Running {n_combos} combinations for [bold]{pattern}[/] on {symbol}/{tf}…")
    with console.status("Running grid…"):
        saved = run_pattern(pattern, symbol, tf, df)
    console.print(f"[green]Done.[/] {saved} results saved (min trades threshold applied).")

    if as_json:
        typer.echo(json.dumps({"saved": saved}))
        return

    # Show best combos
    from belfort.storage.db import top_runs
    rows = top_runs(symbol, tf, n=5, sort_by="sharpe")
    if rows:
        t = Table(title=f"Top 5 combos for {pattern}")
        t.add_column("Pattern")
        t.add_column("Params", style="dim")
        t.add_column("Win %")
        t.add_column("PF")
        t.add_column("Sharpe")
        t.add_column("DD %")
        t.add_column("Trades")
        for r in rows:
            t.add_row(
                r["pattern_id"],
                str(r["params"]),
                f"{r['win_rate']:.1%}",
                f"{r['profit_factor']:.2f}",
                f"{r['sharpe']:.2f}",
                f"{r['max_drawdown']:.1%}",
                str(r["total_trades"]),
            )
        console.print(t)


@app.command("all")
def run_all(
    symbol: str = typer.Argument("BTCUSDT"),
    tf: str = typer.Option("4h", "--tf"),
    workers: int = typer.Option(1, "--workers", "-w"),
    since: str = typer.Option("2y", "--since"),
):
    """Run full grid backtest for ALL patterns (may take 30 min – 2 h)."""
    from belfort.backtest.grid import run_all as _run_all, combo_count
    from belfort.data.loader import load
    from belfort.patterns.registry import all_backtestable

    df = load(symbol, tf, since=since)
    if df is None or df.empty:
        console.print("[red]No data. Run: belfort data fetch[/]")
        raise typer.Exit(1)

    patterns = all_backtestable()
    n_combos = combo_count()
    console.print(
        f"[bold]{len(patterns)} patterns[/] × {n_combos} combos on {symbol}/{tf} | "
        f"workers={workers}"
    )
    console.print("[yellow]This may take a long time. Results saved incrementally.[/]")

    completed = [0]

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Running…", total=len(patterns))

        def cb(done: int, total: int, pid: str):
            completed[0] = done
            progress.update(task, completed=done, description=f"{pid}")

        results = _run_all(symbol, tf, df, workers=workers, progress_callback=cb)

    total_saved = sum(results.values())
    console.print(f"[green]Done.[/] {total_saved} results saved across {len(results)} patterns.")


@app.command("report")
def report(
    symbol: str = typer.Argument("BTCUSDT"),
    tf: str = typer.Option("4h", "--tf"),
    top: int = typer.Option(20, "--top"),
    sort_by: str = typer.Option("sharpe", "--sort", help="sharpe|win_rate|profit_factor"),
    as_json: bool = typer.Option(False, "--json"),
):
    """Show top backtest results from DuckDB."""
    from belfort.storage.db import top_runs, has_any_results

    if not has_any_results(symbol, tf):
        console.print(f"[yellow]No backtest results for {symbol}/{tf}. Run: belfort backtest all[/]")
        raise typer.Exit(0)

    rows = top_runs(symbol, tf, n=top, sort_by=sort_by)
    if as_json:
        typer.echo(json.dumps(rows, indent=2, default=str))
        return

    t = Table(title=f"Top {top} patterns — {symbol} {tf} (sort: {sort_by})")
    t.add_column("#")
    t.add_column("Pattern", style="cyan")
    t.add_column("Win %")
    t.add_column("PF")
    t.add_column("Sharpe")
    t.add_column("DD %")
    t.add_column("Trades")
    t.add_column("Params", style="dim", no_wrap=False)

    for i, r in enumerate(rows, 1):
        t.add_row(
            str(i), r["pattern_id"],
            f"{r['win_rate']:.1%}", f"{r['profit_factor']:.2f}",
            f"{r['sharpe']:.2f}", f"{r['max_drawdown']:.1%}",
            str(r["total_trades"]),
            json.dumps({k: v for k, v in r["params"].items() if v != "none"}, separators=(",", ":")),
        )
    console.print(t)
