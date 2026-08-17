# ControlCenter

<div align="center">
  <h3>Next-Generation Zero-Trust Infrastructure & Server Management Dashboard</h3>
  <p>Real-time machine telemetry, Web-based SSH terminals, Obsidian-style infrastructure star graph, and zero-trust daemon orchestration.</p>
  <p>
    <a href="https://code.weexnes.dev/ControlCenter"><strong>Web Dashboard Repository</strong></a> •
    <a href="https://code.weexnes.dev/ControlCenter/ControlCenter.Daemon"><strong>Daemon Agent Repository</strong></a>
  </p>
</div>

---

## 🌟 Overview

**ControlCenter** is a self-hosted, lightweight, and database-free infrastructure management hub built with **Nuxt 3**, **Vue 3**, **TailwindCSS**, and **DaisyUI**. 

It provides enterprise-grade observability and control across physical servers, cloud VMs, edge devices, and local networking equipment (routers, switches, firewalls, subnets) with out-of-the-box HTTPS/WSS security and zero open incoming ports on managed nodes.

---

## ✨ Key Features

- 🔒 **Zero-Trust Outgoing Node Connections:** Managed nodes run the lightweight `controlcenter-daemon` and initiate outbound secure WebSocket (`wss://`) connections to the server. No incoming ports need to be forwarded or exposed on client machines.
- 🌌 **Obsidian-Style Star Graph Topology (`/topology`):**
  - Interactive HTML5 canvas with custom force-directed spring and repulsion physics.
  - Multi-homed IP matching: Nodes with multiple network interfaces (physical LAN, Netmaker VPN, Wireguard, Docker bridges) automatically link to matching router CIDR subnets simultaneously.
  - Satellite port badges displaying live reachability dots, latency, and custom Public Domain / Reverse Proxy URLs.
  - Interactive Device & Network Inventory list below canvas with search, filter tabs, and 1-click graph visibility toggles.
- 💻 **Integrated Web-SSH Terminal (`xterm.js`):**
  - Seamless, low-latency interactive SSH terminal right in your browser over encrypted WebSockets.
  - Automated Ed25519 SSH keypair generation and management with zero-touch node authentication.
- 📈 **Real-Time Telemetry & Observability:**
  - Live streaming CPU usage, RAM utilization, storage mounts, network transfer rates, system uptime, and OS details.
- 🛡️ **Zero-Database File Architecture:**
  - Fast, portable, and clean state persistence directly in `~/.controlcenter/settings.json`.
- 🔐 **Out-of-the-Box HTTPS & Certificate Fingerprint Pinning:**
  - Auto-generated self-signed SSL certificate with full SAN IP/DNS mapping.
  - Preloaded ESM SSL injector ensuring native HTTPS/WSS when run under `systemd`, `AUR`, or CLI without manual environment configuration.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Web Browser                       │
│        (Nuxt 3 / Vue 3 SPA + xterm.js + Canvas Graph)       │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / WSS
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               ControlCenter Server (Nitro / H3)             │
│  - Auto-SSL Preloader (HTTPS / WSS on Port 4382)            │
│  - Zero-Trust Daemon Manager & Web-SSH Gateway              │
│  - CIDR Multi-Homed Network Engine & Reachability Prober    │
│  - State Storage: ~/.controlcenter/settings.json            │
└──────────────▲───────────────────────────────▲──────────────┘
               │ WSS Outbound Handshake        │ WSS Outbound Handshake
               │ (Port 4382)                   │ (Port 4382)
┌──────────────┴──────────────┐ ┌──────────────┴──────────────┐
│  Node 1 (Linux Server / VM) │ │ Node 2 (Edge / Multi-Homed) │
│   ControlCenter.Daemon      │ │   ControlCenter.Daemon      │
│   - CPU, RAM, Disk, Net     │ │   - LAN: 192.168.178.67     │
│   - Process Collector       │ │   - VPN: 100.64.0.12        │
└─────────────────────────────┘ └─────────────────────────────┘
```

---

## 🚀 Quick Start

### Option 1: Arch Linux / AUR Installation (Recommended)

```bash
# Install ControlCenter Web from AUR
yay -S controlcenter

# Enable and start the background service
sudo systemctl enable --now controlcenter
```

Access the dashboard at `https://<server-ip>:4382`.

### Option 2: Manual Installation & Build

```bash
# Clone the repository
git clone https://code.weexnes.dev/ControlCenter.git
cd ControlCenter.Web

# Install dependencies
npm install

# Build the production application
npm run build

# Start the server (runs native HTTPS/WSS)
PORT=4382 node .output/server/index.mjs
# or use the helper script:
./start.sh
```

---

## 📡 Connecting Nodes (Daemon Setup)

On any machine you want to monitor, install and connect the daemon:

```bash
# Download and install daemon
curl -sSL https://code.weexnes.dev/ControlCenter/ControlCenter.Daemon/~raw/master/install.sh | sudo bash

# Connect daemon to ControlCenter server (replaces 100.64.0.4 with your server IP)
controlcenter-daemon --address 100.64.0.4:4382
```

New nodes automatically appear in **Pending Approval** on your dashboard for zero-trust authorization.

---

## 🧪 Security & Testing

ControlCenter includes an automated security test suite (`Vitest`) covering:
- Authentication & JWT token security
- Unauthenticated API endpoint blocking
- WebSocket handshake authorization (`/ws/daemon` & `/ws/ssh`)
- Machine auto-enrollment authorization
- CIDR multi-homed subnet matching
- SSH keypair generation and permission safety

Run all tests:
```bash
npx vitest run
```

---

## 📂 Project Structure

```
ControlCenter.Web/
├── .docs/                    # Developer documentation & architecture specs
├── components/               # Vue components (Graph, Drawer, Inventory List, Modals)
├── core/                     # TypeScript definitions & global settings schema
├── pages/                    # Frontend routes (Dashboard, Topology, Login, Setup)
├── server/
│   ├── api/                  # REST API endpoints (Auth, Machines, Infrastructure, SSH)
│   ├── middleware/           # JWT Authentication middleware
│   ├── routes/ws/            # Encrypted WebSocket handlers (/ws/daemon & /ws/ssh)
│   └── util/                 # Daemon manager, CIDR matcher, TCP reachability prober
├── tests/security/           # Vitest security & integration test suites
├── nuxt.config.ts            # Nuxt configuration & Nitro auto-SSL preloader
└── start.sh                  # Startup and certificate initialization script
```

---

## 📄 License

GPL-3.0 License. Built with ❤️ for self-hosters and system administrators.