# Belfort — Crypto Investment Analysis Engine

Backend engine for the investments_belfort platform.

## Features

- **All candlestick patterns** via TA-Lib (61 CDL*) + pandas-ta-classic fallback
- **Chart figures**: H&S, double top/bottom, triangles, flags (chart_patterns + stock-pattern)
- **Market structure**: BOS, CHoCH, HH/HL, FVG, Order Blocks (scipy + custom)
- **Full indicator suite**: RSI, MACD, ADX, ATR, BB, Stoch, OBV, SAR, Williams %R, CCI
- **Multi-timeframe trend** analysis with confluence scoring (0–100)
- **Full grid backtest** (VectorBT): all patterns × all SL/TP/filter combinations
- **FastAPI** server serving the contracts/openapi.yaml contract
- **CLI** (Typer + Rich) for all operations

## Quick start

```bash
# Install dependencies (system: ta-lib C library first)
sudo apt-get install build-essential
# Install libta-lib (Ubuntu/Debian)
sudo apt-get install libta-lib-dev || (
  wget http://prdownloads.sourceforge.net/ta-lib/ta-lib-0.4.0-src.tar.gz &&
  tar -xzf ta-lib-0.4.0-src.tar.gz && cd ta-lib &&
  ./configure --prefix=/usr && make && sudo make install
)

# Install Python package
cd backend
pip install -e ".[talib,test]"
# or with uv:
uv pip install -e ".[talib,test]"

# Check everything works
belfort doctor

# Fetch data
belfort data fetch BTCUSDT --tf 4h --since 2y

# Run analysis
belfort analyze BTCUSDT --tf 4h

# List all patterns
belfort patterns list

# Single backtest
belfort backtest run BTCUSDT --tf 4h --pattern cdl_engulfing --sl-atr 1.5 --tp-rr 2

# Full grid backtest (all patterns, slow!)
belfort backtest all BTCUSDT --tf 4h --workers 4

# Best results report
belfort backtest report BTCUSDT --tf 4h --top 20 --sort sharpe

# Start API server
belfort serve --port 8001

# Run tests
pytest
```

## Architecture

```
src/belfort/
├── config.py              Configuration from .env
├── analysis.py            Main pipeline (used by CLI and API)
├── data/                  OHLCV ingestion + Parquet cache
├── indicators/            TA-Lib + pandas-ta wrappers
├── patterns/              Unified registry + all pattern sources
│   ├── candles_talib.py   61 TA-Lib CDL* patterns (primary)
│   ├── candles_pta.py     pandas-ta extras + fallback
│   ├── chart_figures.py   H&S, triangles, flags, double top/bottom
│   ├── structure.py       HH/HL, BOS, CHoCH
│   ├── smc.py             Fair Value Gaps, Order Blocks
│   └── levels.py          Support/Resistance (DBSCAN clustering)
├── trend/                 Multi-TF trend analysis
├── scoring/               Confluence scoring (0–100)
├── backtest/              VectorBT engine + full grid
├── storage/               DuckDB results + Parquet OHLCV
├── jobs/                  SQLite job queue + worker
├── api/                   FastAPI routes + mappers to OpenAPI
└── cli/                   Typer CLI commands
```

## Environment variables

Copy `.env.example` to `.env` and adjust:

| Variable | Default | Description |
|----------|---------|-------------|
| `BELFORT_DATA_DIR` | `~/.belfort` | Root data directory |
| `BELFORT_EXCHANGE` | `binance` | Exchange for OHLCV |
| `BELFORT_TIMEFRAMES` | `1h,4h,1D` | Default TFs |
| `BELFORT_SYMBOLS` | `BTCUSDT` | Default symbols |
| `BELFORT_API_PORT` | `8001` | API server port |
| `BELFORT_BT_MIN_TRADES` | `10` | Min trades to save backtest result |

## API

The server implements [contracts/openapi.yaml](../contracts/openapi.yaml).

Endpoints:
- `GET /ohlcv/{symbol}` — OHLCV candles
- `GET /analysis/{symbol}` — Full technical analysis
- `GET /analysis/{symbol}/chart-markers` — Pattern markers for chart
- `POST /analysis/{symbol}/refresh` — Queue analysis refresh job
- `GET /backtest/{symbol}` — Best backtest metrics
- `POST /backtest/{symbol}/refresh` — Queue full grid backtest
- `GET /jobs/{id}` — Job status
- `GET /health` — Health check
