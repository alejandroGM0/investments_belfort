# Investments Belfort

Crypto investment analysis platform: technical pattern engine, backtesting, and web UI.

## Structure

| Directory | Description |
|-----------|-------------|
| [`backend/`](backend/) | Belfort engine (FastAPI, CLI, TA-Lib, VectorBT) |
| [`frontend/`](frontend/) | Next.js app (ranking, per-asset analysis, MSW mocks) |
| [`contracts/`](contracts/) | Shared OpenAPI contract |

## Quick start

```bash
# Backend
cd backend && pip install -e ".[talib,test]" && belfort doctor

# Frontend
cd frontend && pnpm install && pnpm dev
```

See [`backend/README.md`](backend/README.md) for TA-Lib installation and CLI usage.

## License

Personal experiment — no explicit license yet.
