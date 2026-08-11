#!/usr/bin/env bash
set -eo pipefail

INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENTRY_POINT="$INSTALL_DIR/server/index.mjs"
NODE_BIN="$(which node || echo "/usr/bin/node")"

export PORT="${PORT:-3000}"
export HOST="${HOST:-0.0.0.0}"
export NODE_ENV="${NODE_ENV:-production}"

if [ ! -f "$ENTRY_POINT" ]; then
    echo "ERROR: Server entrypoint '$ENTRY_POINT' not found."
    echo "Make sure this script is executed from the root of the unpacked ControlCenter Web directory."
    exit 1
fi

echo "=========================================="
echo " Starting ControlCenter Web Application  "
echo "=========================================="
echo "  Directory: $INSTALL_DIR"
echo "  Node Bin:  $NODE_BIN"
echo "  Host:      $HOST"
echo "  Port:      $PORT"
echo "=========================================="

cd "$INSTALL_DIR"
exec "$NODE_BIN" server/index.mjs
