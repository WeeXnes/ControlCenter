#!/usr/bin/env bash
set -eo pipefail

INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_BIN="$(which node || echo "/usr/bin/node")"

export PORT="${PORT:-3000}"
export HOST="${HOST:-0.0.0.0}"
export NODE_ENV="${NODE_ENV:-production}"

if [ -f "$INSTALL_DIR/.output/server/index.mjs" ]; then
    ENTRY_POINT="$INSTALL_DIR/.output/server/index.mjs"
elif [ -f "$INSTALL_DIR/server/index.mjs" ]; then
    ENTRY_POINT="$INSTALL_DIR/server/index.mjs"
else
    echo "ERROR: Server entrypoint not found (checked '.output/server/index.mjs' and 'server/index.mjs')."
    echo "Make sure to build the project first with 'npm run build'."
    exit 1
fi

DATA_DIR="${DATA_DIR:-$HOME/.controlcenter}"
CERTS_DIR="$DATA_DIR/certs"
CERT_FILE="$CERTS_DIR/cert.pem"
KEY_FILE="$CERTS_DIR/key.pem"

mkdir -p "$CERTS_DIR"

if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    if command -v openssl &>/dev/null; then
        echo "[+] Generating Self-Signed SSL Certificate for Out-Of-The-Box HTTPS..."
        HOSTNAME_VAL="$(hostname 2>/dev/null || echo "localhost")"
        openssl req -x509 -newkey rsa:2048 -nodes -keyout "$KEY_FILE" -out "$CERT_FILE" -days 3650 \
            -subj "/CN=ControlCenter/O=ControlCenter" \
            -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:0.0.0.0,DNS:$HOSTNAME_VAL" 2>/dev/null || true
        chmod 600 "$KEY_FILE" 2>/dev/null || true
        chmod 644 "$CERT_FILE" 2>/dev/null || true
    fi
fi

SSL_ENABLED="No (HTTP)"
FP=""
if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
    export NITRO_SSL_CERT="$(cat "$CERT_FILE")"
    export NITRO_SSL_KEY="$(cat "$KEY_FILE")"
    SSL_ENABLED="Yes (HTTPS / WSS Active)"
    if command -v openssl &>/dev/null; then
        FP=$(openssl x509 -noout -fingerprint -sha256 -in "$CERT_FILE" | cut -d= -f2)
    fi
fi

echo "=========================================="
echo " Starting ControlCenter Web Application  "
echo "=========================================="
echo "  Directory:    $INSTALL_DIR"
echo "  Entrypoint:   $ENTRY_POINT"
echo "  Node Bin:     $NODE_BIN"
echo "  Host:         $HOST"
echo "  Port:         $PORT"
echo "  Self-Signed:  $SSL_ENABLED"
if [ -n "$FP" ]; then
echo "  SHA-256 Pin:  $FP"
fi
echo "=========================================="

cd "$INSTALL_DIR"
exec "$NODE_BIN" "$ENTRY_POINT"
