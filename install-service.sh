#!/usr/bin/env bash
set -eo pipefail

SERVICE_NAME="controlcenter-web"
INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENTRY_POINT="$INSTALL_DIR/server/index.mjs"
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

echo "=========================================="
echo " ControlCenter Web Systemd Service Installer"
echo "=========================================="
echo "  Service Name:       $SERVICE_NAME"
echo "  Install Directory:  $INSTALL_DIR"
echo "  User:               $RUN_USER"
echo "  Group:              $RUN_GROUP"
echo "  Node Executable:    $NODE_BIN"
echo "  Port:               $PORT"
echo "=========================================="

if [ ! -f "$ENTRY_POINT" ]; then
    echo "ERROR: Entrypoint '$ENTRY_POINT' not found."
    echo "Make sure this script is run from the root of the unpacked ControlCenter Web directory."
    exit 1
fi

UNIT_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

# Require root/sudo to write systemd unit
if [ "$EUID" -ne 0 ]; then
    echo "[+] Privileges required to install systemd unit. Escalating with sudo..."
    exec sudo PORT="$PORT" HOST="$HOST" SUDO_USER="$RUN_USER" "$0" "$@"
fi

cat <<EOF > "$UNIT_FILE"
[Unit]
Description=ControlCenter Web Interface
After=network.target

[Service]
Type=simple
User=$RUN_USER
Group=$RUN_GROUP
WorkingDirectory=$INSTALL_DIR
ExecStart=$NODE_BIN server/index.mjs
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
