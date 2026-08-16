#!/usr/bin/env bash
set -eo pipefail

SERVICE_NAME="controlcenter-web"
INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_BIN="$(which node || echo "/usr/bin/node")"

# Determine target execution user and group
if [ -n "$SUDO_USER" ]; then
    RUN_USER="$SUDO_USER"
else
    RUN_USER="$(id -un)"
fi
RUN_GROUP="$(id -gn "$RUN_USER")"

PORT="${PORT:-3000}"
HOST="${HOST:-0.0.0.0}"

if [ "$1" = "--uninstall" ] || [ "$1" = "-u" ]; then
    echo "Uninstalling $SERVICE_NAME service..."
    if [ "$EUID" -ne 0 ]; then
        exec sudo "$0" "$@"
    fi
    systemctl disable --now "${SERVICE_NAME}.service" || true
    rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
    systemctl daemon-reload
    echo "[+] $SERVICE_NAME service uninstalled successfully."
    exit 0
fi

if [ -f "$INSTALL_DIR/.output/server/index.mjs" ]; then
    ENTRY_POINT="$INSTALL_DIR/.output/server/index.mjs"
elif [ -f "$INSTALL_DIR/server/index.mjs" ]; then
    ENTRY_POINT="$INSTALL_DIR/server/index.mjs"
else
    echo "ERROR: Server entrypoint not found (checked '.output/server/index.mjs' and 'server/index.mjs')."
    echo "Make sure to run 'npm run build' before installing the service."
    exit 1
fi

echo "=========================================="
echo " ControlCenter Web Systemd Service Installer"
echo "=========================================="
echo "  Service Name:       $SERVICE_NAME"
echo "  Install Directory:  $INSTALL_DIR"
echo "  Entrypoint:         $ENTRY_POINT"
echo "  User:               $RUN_USER"
echo "  Group:              $RUN_GROUP"
echo "  Node Executable:    $NODE_BIN"
echo "  Port:               $PORT"
echo "=========================================="

# Make start.sh executable
chmod +x "$INSTALL_DIR/start.sh" 2>/dev/null || true

# Rebuild native modules if npm is available to ensure GLIBC compatibility on target OS
if command -v npm &>/dev/null; then
    echo "[+] Rebuilding native modules for local GLIBC compatibility..."
    if [ -d "$INSTALL_DIR/.output/server" ]; then
        (cd "$INSTALL_DIR/.output/server" && npm rebuild &>/dev/null || true)
    elif [ -d "$INSTALL_DIR/server" ]; then
        (cd "$INSTALL_DIR/server" && npm rebuild &>/dev/null || true)
    fi
fi

UNIT_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

# Require root/sudo to write systemd unit
if [ "$EUID" -ne 0 ]; then
    echo "[+] Privileges required to install systemd unit. Escalating with sudo..."
    exec sudo PORT="$PORT" HOST="$HOST" SUDO_USER="$RUN_USER" "$0" "$@"
fi

cat <<EOF > "$UNIT_FILE"
[Unit]
Description=ControlCenter Web Interface (Self-Signed HTTPS & Zero-Trust Server)
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$RUN_USER
Group=$RUN_GROUP
WorkingDirectory=$INSTALL_DIR
ExecStart=$INSTALL_DIR/start.sh
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=$PORT
Environment=HOST=$HOST

[Install]
WantedBy=multi-user.target
EOF

chmod 644 "$UNIT_FILE"
systemctl daemon-reload
systemctl enable --now "${SERVICE_NAME}.service"

echo "[+] Successfully installed and started ${SERVICE_NAME}.service!"
echo "[+] Status:"
systemctl status "${SERVICE_NAME}.service" --no-pager || true
