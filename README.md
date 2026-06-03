# Investments Belfort

Plataforma de análisis de inversiones en cripto: motor de patrones técnicos, backtest y UI.

## Estructura

| Directorio | Descripción |
|------------|-------------|
| [`backend/`](backend/) | Motor Belfort (FastAPI, CLI, TA-Lib, VectorBT) |
| [`frontend/`](frontend/) | App Next.js (ranking, análisis por activo, mocks MSW) |
| [`contracts/`](contracts/) | Contrato OpenAPI compartido |

## Inicio rápido

```bash
# Backend
cd backend && pip install -e ".[talib,test]" && belfort doctor

# Frontend
cd frontend && pnpm install && pnpm dev
```

Ver [`backend/README.md`](backend/README.md) para instalación de TA-Lib y uso del CLI.

## Licencia

Experimento personal — sin licencia explícita por ahora.
