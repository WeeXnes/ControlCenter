# Setup & Deployment Guide

This guide covers installing, configuring, and deploying ControlCenter Web and the ControlCenter Daemon across Linux systems.

---

## 1. Server Installation (ControlCenter Web)

### Option A: Arch Linux / AUR Installation (Recommended)

The AUR package bundles the precompiled application and installs the `controlcenter.service` systemd unit.

```bash
# Install via yay or paru
yay -S controlcenter

# Enable and start the systemd service
sudo systemctl enable --now controlcenter

# Check status
systemctl status controlcenter
```

The server automatically creates self-signed TLS certificates in `~/.controlcenter/certs/` and begins listening on `https://0.0.0.0:4382`.

---

### Option B: Manual Build & Run

#### Prerequisites
- Node.js 20+ (LTS recommended)
- npm or yarn
- OpenSSL (for certificate generation)

```bash
# 1. Clone repository
git clone https://code.weexnes.dev/ControlCenter.git
cd ControlCenter.Web

# 2. Install dependencies
npm install

# 3. Compile production build
npm run build

# 4. Start the server (runs native HTTPS/WSS)
PORT=4382 node .output/server/index.mjs
```

---

## 2. Initial Administrator Setup

1. Open your browser and navigate to `https://<server-ip>:4382`.
2. Accept the self-signed SSL certificate warning in your browser.
3. You will be greeted by the **Setup Screen** (`/setup`).
4. Set a strong administrator password.
5. On completion, ControlCenter generates a secure random 256-bit JWT secret, initializes `~/.controlcenter/settings.json`, and generates your default Ed25519 SSH keypair in `~/.ssh/ControlCenterKeys/`.

---

## 3. Node Installation (ControlCenter Daemon)

Managed nodes run `controlcenter-daemon` to stream CPU, RAM, disk, network, and process metrics over outbound WebSocket connections.

### Option A: One-Line Installer Script

```bash
curl -sSL https://code.weexnes.dev/ControlCenter/ControlCenter.Daemon/~raw/master/install.sh | sudo bash
```

### Option B: AUR Package (Arch Linux)

```bash
yay -S controlcenter-daemon
```

### Connecting Node to Server

```bash
# Start daemon with target server address
controlcenter-daemon --address 100.64.0.4:4382

# Optional: Pin the server's SSL certificate fingerprint (SHA-256)
controlcenter-daemon --address 100.64.0.4:4382 --fingerprint "E95CD8594F4BCE1786046E8F1B097F0D1ABD346712873DA1C7E8529CDC5C1991"
```

---

## 4. Node Approval Workflow (Zero-Trust)

1. When a new node connects for the first time, it is placed in the **Pending Approval** queue on your ControlCenter dashboard.
2. In the dashboard, click **Approve** on the new node card.
3. Once approved, the node transitions to active telemetry streaming and becomes available for SSH terminals and network graph placement.

---

## 5. Systemd Service Files Reference

### ControlCenter Web Service (`/usr/lib/systemd/system/controlcenter.service`):
```ini
[Unit]
Description=ControlCenter Web Interface
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/controlcenter
ExecStart=/usr/bin/node /opt/controlcenter/server/index.mjs
Restart=always
RestartSec=3
Environment=PORT=4382
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### ControlCenter Daemon Service (`/etc/systemd/system/controlcenter-daemon.service`):
```ini
[Unit]
Description=ControlCenter Daemon (Zero-Trust Agent)
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/controlcenter-daemon --address 100.64.0.4:4382
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
```
