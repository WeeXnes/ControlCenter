<div align="center">
  <img src="public/wicon.png" width="96" alt="" />
  <h1>ControlCenter</h1>
  <p>Self-hosted, database-free infrastructure and server management dashboard with zero-trust node telemetry.</p>
  <p>
    <a href="#license"><img src="https://img.shields.io/badge/license-GPL--3.0-000000?style=flat-square&labelColor=1f1f1f" alt="License" /></a>
    <a href="#install"><img src="https://img.shields.io/badge/platform-Linux-000000?style=flat-square&labelColor=1f1f1f" alt="Platform" /></a>
    <a href="#architecture"><img src="https://img.shields.io/badge/stack-Nuxt%203%20%C2%B7%20Nitro-000000?style=flat-square&labelColor=1f1f1f" alt="Stack" /></a>
  </p>
  <p>
    <a href="https://code.weexnes.dev/ControlCenter">Web dashboard repository</a> ·
    <a href="https://code.weexnes.dev/ControlCenter/ControlCenter.Daemon">Daemon agent repository</a>
  </p>
</div>

---

Real-time machine telemetry, web-based SSH terminals, an Obsidian-style infrastructure star graph, and zero-trust daemon
orchestration. Built with **Nuxt 3**, **Vue 3**, **TailwindCSS** and **DaisyUI**.

It provides observability and control across physical servers, cloud VMs, edge devices and local networking equipment
(routers, switches, firewalls, subnets), with out-of-the-box HTTPS/WSS security and zero open incoming ports on managed nodes.

## Features

- **Zero-trust outgoing node connections:** managed nodes run the lightweight `controlcenter-daemon` and open outbound secure WebSocket (`wss://`) connections to the server. No incoming ports need to be forwarded or exposed on client machines.
- **Obsidian-style star graph topology (`/topology`):**
  - Interactive HTML5 canvas with custom force-directed spring and repulsion physics.
  - Multi-homed IP matching: nodes with multiple network interfaces (physical LAN, Netmaker VPN, WireGuard, Docker bridges) link to matching router CIDR subnets simultaneously.
  - Satellite port badges showing live reachability dots, latency, and custom public domain / reverse proxy URLs.
  - Interactive device and network inventory list below the canvas with search, filter tabs, and one-click graph visibility toggles.
- **Integrated web SSH terminal (`xterm.js`):**
  - Low-latency interactive SSH terminal in your browser over encrypted WebSockets.
  - Automated Ed25519 SSH keypair generation and management with zero-touch node authentication.
- **Real-time telemetry and observability:**
  - Live streaming CPU usage, RAM utilization, storage mounts, network transfer rates, system uptime, and OS details.
- **Zero-database file architecture:**
  - Fast, portable state persistence directly in `~/.controlcenter/settings.json`.
- **Out-of-the-box HTTPS and certificate fingerprint pinning:**
  - Auto-generated self-signed SSL certificate with full SAN IP/DNS mapping.
  - Preloaded ESM SSL injector for native HTTPS/WSS when run under `systemd`, `AUR`, or CLI without manual environment configuration.

### Architecture

```text
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

## Install

### Arch Linux / AUR (recommended)

```bash
# Install ControlCenter Web from the AUR
yay -S controlcenter

# Enable and start the background service
sudo systemctl enable --now controlcenter
```

Open the dashboard at `https://<server-ip>:4382`.

### Manual installation

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

## Usage

### Connecting nodes (daemon setup)

On any machine you want to monitor, install and connect the [daemon](https://code.weexnes.dev/ControlCenter/ControlCenter.Daemon):

```bash
# Download and install the daemon
curl -sSL https://code.weexnes.dev/ControlCenter/ControlCenter.Daemon/~raw/master/install.sh | sudo bash

# Connect the daemon to the ControlCenter server (replace 100.64.0.4 with your server IP)
controlcenter-daemon --address 100.64.0.4:4382
```

New nodes appear in **Pending Approval** on your dashboard for zero-trust authorization.

## Build from source

See [Manual installation](#manual-installation) for the build commands.

### Security and testing

ControlCenter includes an automated security test suite (`Vitest`) covering:

- Authentication and JWT token security
- Unauthenticated API endpoint blocking
- WebSocket handshake authorization (`/ws/daemon` and `/ws/ssh`)
- Machine auto-enrollment authorization
- CIDR multi-homed subnet matching
- SSH keypair generation and permission safety

Run all tests:

```bash
npx vitest run
```

## Project structure

```text
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

## License

GPL-3.0 License. Built for self-hosters and system administrators.
