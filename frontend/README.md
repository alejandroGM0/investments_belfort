# Belfort — Frontend

Plataforma de análisis técnico, sentimiento y noticias para criptomonedas.

**Stack**: Next.js 16 · React 19 · TypeScript strict · Tailwind CSS v4 · shadcn/ui · TanStack Query v5 · Zustand · MSW · Lightweight Charts · Vitest

---

## Comandos

```bash
# Instalar dependencias
pnpm install

# Desarrollo con mocks
pnpm dev

# Generar tipos TypeScript desde el contrato OpenAPI
pnpm gen:types

# Tests
pnpm test          # run once
pnpm test:ui       # Vitest UI

# Build de producción
pnpm build
pnpm start
```

---

## Variables de entorno

Copia `.env.local.example` como `.env.local` y ajusta los valores:

```env
# URL base del gateway de la API (backend Python/FastAPI)
NEXT_PUBLIC_API_BASE=http://localhost:8000

# true → activa MSW para interceptar peticiones con fixtures mock
# false → peticiones van directamente a NEXT_PUBLIC_API_BASE
NEXT_PUBLIC_USE_MOCKS=true

# F2/F3: passthrough selectivo a backend real (con USE_MOCKS=true)
NEXT_PUBLIC_SENTIMENT_REAL=false
NEXT_PUBLIC_NEWS_REAL=false

# Símbolo y timeframe seleccionados al arrancar
NEXT_PUBLIC_DEFAULT_SYMBOL=BTC
NEXT_PUBLIC_DEFAULT_TIMEFRAME=4h
```

---

## Activar / desactivar mocks por fase

### F1 — UI con mocks (por defecto)
```env
NEXT_PUBLIC_USE_MOCKS=true
```
MSW intercepta todas las rutas devolviendo fixtures de `src/mocks/fixtures/`.

### F2 — Sentimiento real
```env
NEXT_PUBLIC_USE_MOCKS=true
NEXT_PUBLIC_SENTIMENT_REAL=true
NEXT_PUBLIC_API_BASE=http://localhost:8000
```
Levanta el backend (`uvicorn belfort.api.main:app --port 8000`). MSW deja pasar solo `/sentiment/*` al API real; el resto de rutas sigue en mock.

Alternativa: `NEXT_PUBLIC_USE_MOCKS=false` desactiva todos los mocks.

### F3 — Noticias reales (CryptoPanic)
```env
NEXT_PUBLIC_USE_MOCKS=true
NEXT_PUBLIC_NEWS_REAL=true
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

1. Token en [CryptoPanic Developers](https://cryptopanic.com/developers/api/) → `backend/.env` como `CRYPTOPANIC_API_TOKEN`.
2. Backend: `cd backend && uv run uvicorn belfort.api.main:app --reload --port 8000`
3. Comprobar: `curl "http://localhost:8000/news/BTC?limit=5"`
4. Frontend: `pnpm dev` → `/asset/BTC/news` (filtro por tono + banner de resumen).

MSW deja pasar solo `/news/*`; TA, sentiment (si no está `SENTIMENT_REAL`), ranking, etc. siguen en mock.

### F4 — Análisis técnico y backtest reales
Levantar el servicio de análisis técnico. Los hooks `useAnalysis`, `useOhlcv`, `useBacktest` y `useRanking` ya están configurados.

Para deshabilitar solo un endpoint mientras el servicio no esté listo, edita `src/mocks/handlers.ts` y comenta el handler correspondiente.

---

## Regenerar tipos tras cambiar el contrato

```bash
# Desde la raíz del monorepo o desde frontend/
pnpm gen:types
# Genera: src/api/types.ts (a partir de ../contracts/openapi.yaml)
```

---

## Estructura del proyecto

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout con providers
│   ├── page.tsx            # Dashboard (/)
│   ├── markets/page.tsx    # Ranking de mercados
│   ├── asset/[symbol]/     # Análisis por activo
│   │   ├── page.tsx        # Tab Resumen
│   │   ├── chart/          # Tab Gráfico
│   │   ├── technical/      # Tab Técnico (patrones + indicadores)
│   │   ├── sentiment/      # Tab Sentimiento
│   │   ├── news/           # Tab Noticias
│   │   ├── strategy/       # Tab Estrategia / Backtest
│   │   └── context/        # Tab Contexto (eventos + correlaciones)
│   ├── settings/           # Ajustes
│   └── legal/              # Aviso legal
├── api/
│   ├── client.ts           # openapi-fetch instance
│   ├── types.ts            # GENERADO — no editar a mano
│   └── hooks/              # useOhlcv, useAnalysis, useSentiment, useNews, useBacktest, useRanking
├── components/
│   ├── ui/                 # shadcn/ui (copiados al repo)
│   ├── layout/             # AppHeader, AppFooter, ThemeToggle
│   ├── navigation/         # MainNav, AssetTabs
│   ├── selectors/          # SymbolSelect, TimeframeSelect, RefreshButton
│   ├── chart/              # PriceChart, ChartToolbar
│   ├── summary/            # MetricCard, ConfluenceScore, TopSignalsList
│   ├── technical/          # PatternFiltersBar, PatternGroupAccordion, LevelsPanel, TradeSetupCard
│   ├── sentiment/          # SentimentGauge
│   ├── news/               # SentimentChip
│   ├── feedback/           # LoadingSkeleton, ErrorState, EmptyState, DisclaimerBanner
│   └── common/             # TrendBadge, ScoreBadge
├── mocks/
│   ├── browser.ts          # MSW worker setup
│   ├── handlers.ts         # Rutas mockeadas
│   └── fixtures/           # JSON realistas (BTC, ranking, backtest…)
├── stores/
│   └── app-store.ts        # Zustand (symbol, timeframe, watchlist)
├── lib/
│   ├── utils.ts            # cn(), fmtPrice(), fmtPct(), fmtNumber(), timeAgo()
│   ├── env.ts              # Variables de entorno parseadas
│   └── query-client.ts     # TanStack Query defaults
└── test/                   # Vitest + Testing Library
```
