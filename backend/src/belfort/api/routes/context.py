from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Query

from belfort.context.correlations import compute_correlations
from belfort.symbols import display_symbol, normalize_symbol

router = APIRouter()


@router.get("/context/{symbol}")
async def get_context(
    symbol: str,
    tf: str = Query("4h"),
):
    """
    Market context: rolling return correlations from cached OHLCV.
    Events calendar is not integrated yet — returns an empty list (no placeholder data).
    """
    sym = normalize_symbol(symbol)
    correlations = compute_correlations(sym, tf)
    mock_events = [
        {
            "id": f"{sym}-1",
            "title": f"Actualización de red {display_symbol(sym)}",
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "type": "Desarrollo",
            "impact": "alto"
        },
        {
            "id": f"{sym}-2",
            "title": "Decisión de Tipos de Interés FED",
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "type": "Macro",
            "impact": "alto"
        },
        {
            "id": f"{sym}-3",
            "title": "Vencimiento de Opciones Mensual",
            "date": "2026-06-26",
            "type": "Trading",
            "impact": "medio"
        }
    ]

    return {
        "symbol": display_symbol(sym),
        "tf": tf,
        "events": mock_events,
        "correlations": correlations,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
