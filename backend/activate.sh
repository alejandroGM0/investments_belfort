#!/usr/bin/env bash
# Source this file to activate the belfort environment with correct paths.
# Usage: source backend/activate.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$SCRIPT_DIR/.venv/bin/activate"

# TA-Lib shared library (locally built in ~/.local)
export LD_LIBRARY_PATH="$HOME/.local/lib:${LD_LIBRARY_PATH:-}"

echo "belfort env activated — TA-Lib path set"
python -c "import talib; print(f'TA-Lib {talib.__version__} ready')" 2>/dev/null || echo "(TA-Lib not found — pandas-ta fallback active)"
