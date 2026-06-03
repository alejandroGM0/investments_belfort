# Belfort — Frontend

Plataforma de análisis técnico, sentimiento y noticias para criptomonedas.

**Stack**: Next.js 16 · React 19 · TypeScript · Tailwind · shadcn/ui · TanStack Query · Zustand · Lightweight Charts

Todos los datos vienen del **backend Belfort** (`NEXT_PUBLIC_API_BASE`). No hay mocks en la aplicación.

---

## Comandos

```bash
pnpm install
pnpm dev              # http://localhost:3000
pnpm gen:types        # regenerar tipos desde ../contracts/openapi.yaml
pnpm test
pnpm build && pnpm start
```

---

## Variables de entorno

Copia `.env.local.example` → `.env.local`:

```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
NEXT_PUBLIC_DEFAULT_SYMBOL=BTC
NEXT_PUBLIC_DEFAULT_TIMEFRAME=4h
```

---

## Arranque completo (frontend + API)

**Terminal 1 — API**

```bash
cd ../backend
source activate.sh
belfort serve --port 8000
```

**Terminal 2 — UI**

```bash
pnpm dev
```

Antes del primer uso, descarga OHLCV para los símbolos que quieras analizar:

```bash
belfort data fetch BTCUSDT --tf 4h --since 2y
belfort data fetch ETHUSDT --tf 4h --since 2y
```

La UI usa símbolos cortos (`BTC`); el cliente los convierte a `BTCUSDT` automáticamente.

---

## Datos por módulo

| Módulo | Fuente |
|--------|--------|
| OHLCV / gráfico | Binance → cache Parquet → `/ohlcv/{symbol}` |
| Análisis técnico | Motor Belfort → `/analysis/{symbol}` |
| Sentimiento | Reddit + RSS → `/sentiment/{symbol}` |
| Noticias | NewsAPI.org (`NEWSAPI_API_KEY` en `backend/.env`) |
| Backtest | DuckDB → `/backtest/{symbol}` |
| Ranking | Análisis en lote → `/ranking` |
| Contexto | Correlaciones reales OHLCV → `/context/{symbol}`; eventos vacíos hasta integrar calendario |

---

## Símbolos

- UI: `BTC`, `ETH`, …
- API: `BTCUSDT`, `ETHUSDT`, … (`src/lib/symbols.ts`)
