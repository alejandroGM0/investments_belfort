"""belfort serve — start the FastAPI server (registered as a direct command in __main__)."""

from __future__ import annotations

from typing import Annotated

import typer


def serve(
    host: Annotated[str, typer.Option("--host", help="Bind host")] = "0.0.0.0",
    port: Annotated[int, typer.Option("--port", help="Bind port")] = 8000,
    reload: Annotated[bool, typer.Option("--reload/--no-reload", help="Auto-reload on code changes")] = False,
):
    """Start the Belfort FastAPI server."""
    import uvicorn

    uvicorn.run(
        "belfort.api.main:app",
        host=host,
        port=port,
        reload=reload,
    )


# Expose as a Typer app for backward compat
app = typer.Typer(help="API server commands.", no_args_is_help=True)
app.command()(serve)
