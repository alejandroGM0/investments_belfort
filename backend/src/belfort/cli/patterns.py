"""belfort patterns — list and describe pattern registry."""

from __future__ import annotations

import json

import typer
from rich.console import Console
from rich.table import Table

app = typer.Typer(help="Pattern registry commands.", no_args_is_help=True)
console = Console()


@app.command("list")
def list_patterns(
    category: str | None = typer.Option(None, "--category", "-c", help="Filter by category"),
    tags: str | None = typer.Option(None, "--tags", help="Comma-separated tag filter"),
    as_json: bool = typer.Option(False, "--json", help="Output JSON"),
):
    """List all registered patterns."""
    from belfort.patterns.registry import REGISTRY

    items = REGISTRY
    if category:
        items = [s for s in items if s.category == category]
    if tags:
        tag_list = [t.strip() for t in tags.split(",")]
        items = [s for s in items if any(t in s.tags for t in tag_list)]

    if as_json:
        out = [{"id": s.id, "name": s.name, "category": s.category, "tags": s.tags} for s in items]
        typer.echo(json.dumps(out, indent=2))
        return

    table = Table(title=f"Registered patterns ({len(items)})")
    table.add_column("ID", style="cyan")
    table.add_column("Name")
    table.add_column("Category", style="magenta")
    table.add_column("Tags")

    for s in items:
        table.add_row(s.id, s.name, s.category, ", ".join(s.tags))

    console.print(table)


@app.command("describe")
def describe(
    pattern_id: str = typer.Argument(..., help="Pattern ID, e.g. cdl_engulfing"),
):
    """Show detailed info about a single pattern."""
    from belfort.patterns.registry import get

    spec = get(pattern_id)
    if spec is None:
        console.print(f"[red]Pattern '{pattern_id}' not found.[/]")
        raise typer.Exit(1)

    console.print(f"\n[bold]{spec.name}[/] ([cyan]{spec.id}[/])")
    console.print(f"Category:    [magenta]{spec.category}[/]")
    console.print(f"Backtestable: {'Yes' if spec.backtestable else 'No'}")
    console.print(f"Tags:        {', '.join(spec.tags)}")
    console.print(f"Description: {spec.description}")
