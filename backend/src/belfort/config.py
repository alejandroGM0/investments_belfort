"""Central configuration loaded from environment / .env file."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
DATA_DIR = Path(os.getenv("BELFORT_DATA_DIR", "~/.belfort")).expanduser()
OHLCV_DIR = DATA_DIR / "ohlcv"
DB_PATH = Path(os.getenv("BELFORT_DB_PATH", str(DATA_DIR / "results.duckdb"))).expanduser()
JOBS_DB_PATH = DATA_DIR / "jobs.db"

# ---------------------------------------------------------------------------
# Exchange / data
# ---------------------------------------------------------------------------
EXCHANGE = os.getenv("BELFORT_EXCHANGE", "binance")
DEFAULT_SYMBOLS: list[str] = [s.strip() for s in os.getenv("BELFORT_SYMBOLS", "BTCUSDT").split(",")]
TIMEFRAMES: list[str] = [t.strip() for t in os.getenv("BELFORT_TIMEFRAMES", "1h,4h,1D").split(",")]

# Map our TF names to ccxt names
TF_CCXT: dict[str, str] = {
    "1h": "1h",
    "4h": "4h",
    "1D": "1d",
    "1W": "1w",
}

# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------
API_HOST = os.getenv("BELFORT_API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("BELFORT_API_PORT", "8000"))

# ---------------------------------------------------------------------------
# Sentiment (F2)
# ---------------------------------------------------------------------------
SENTIMENT_CACHE_DIR = DATA_DIR / "sentiment"
SENTIMENT_CACHE_TTL_SECONDS = int(os.getenv("SENTIMENT_CACHE_TTL_SECONDS", "900"))

REDDIT_CLIENT_ID = os.getenv("REDDIT_CLIENT_ID", "")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET", "")
REDDIT_USER_AGENT = os.getenv("REDDIT_USER_AGENT", "belfort-sentiment/0.1")

_DEFAULT_RSS = ",".join(
    [
        "https://www.coindesk.com/arc/outboundfeeds/rss/",
        "https://cointelegraph.com/rss",
        "https://bitcoinmagazine.com/.rss/full/",
    ]
)
SENTIMENT_RSS_FEEDS: list[str] = [
    u.strip() for u in os.getenv("SENTIMENT_RSS_FEEDS", _DEFAULT_RSS).split(",") if u.strip()
]

LUNARCRUSH_API_KEY = os.getenv("LUNARCRUSH_API_KEY", "")
SANBASE_API_KEY = os.getenv("SANBASE_API_KEY", os.getenv("SANTIMENT_API_KEY", ""))

REDDIT_POST_LIMIT = int(os.getenv("REDDIT_POST_LIMIT", "25"))
REDDIT_COMMENT_LIMIT = int(os.getenv("REDDIT_COMMENT_LIMIT", "50"))

# ---------------------------------------------------------------------------
# News (F3 — CryptoPanic)
# ---------------------------------------------------------------------------
CRYPTOPANIC_API_TOKEN = os.getenv("CRYPTOPANIC_API_TOKEN", "")
CRYPTOPANIC_BASE_URL = os.getenv("CRYPTOPANIC_BASE_URL", "https://cryptopanic.com/api/v1")
NEWS_CACHE_TTL_SECONDS = int(os.getenv("BELFORT_NEWS_CACHE_TTL", "300"))

# ---------------------------------------------------------------------------
# Worker
# ---------------------------------------------------------------------------
WORKER_POLL_SECONDS = float(os.getenv("BELFORT_WORKER_POLL_SECONDS", "2"))

# ---------------------------------------------------------------------------
# Backtest
# ---------------------------------------------------------------------------
BT_MIN_TRADES = int(os.getenv("BELFORT_BT_MIN_TRADES", "10"))

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def ensure_dirs() -> None:
    """Create all required data directories."""
    for d in (DATA_DIR, OHLCV_DIR, SENTIMENT_CACHE_DIR):
        d.mkdir(parents=True, exist_ok=True)
