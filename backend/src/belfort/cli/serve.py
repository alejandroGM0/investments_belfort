"""belfort serve — start the FastAPI server."""

import typer

app = typer.Typer(help="API server commands.", invoke_without_command=True)


@app.callback(invoke_without_command=True)
def serve(
    host: str = typer.Option("0.0.0.0", "--host"),
    port: int = typer.Option(8001, "--port"),
    reload: bool = typer.Option(False, "--reload"),
):
    """Start the Belfort FastAPI server."""
    import uvicorn

    uvicorn.run(
        "belfort.api.main:app",
        host=host,
        port=port,
        reload=reload,
    )
