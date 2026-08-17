# ControlCenter Introduction

Welcome to the **ControlCenter** developer and architectural documentation.

## What is ControlCenter?

ControlCenter is a high-performance, database-free server and infrastructure management dashboard. It combines real-time hardware telemetry streaming, an interactive Obsidian-style star graph network topology, in-browser Web-SSH terminals, and a zero-trust daemon client architecture.

### Problem It Solves

Traditional server dashboards either:
1. Require configuring firewall rules and forwarding inbound ports on every target machine.
2. Require heavy multi-service database stacks (PostgreSQL, Redis, InfluxDB).
3. Lack visual representation of multi-homed network links (LAN, WireGuard, Netmaker mesh VPNs, Docker bridges) and running services.

ControlCenter solves this with:
- **Zero Inbound Ports on Nodes:** Managed nodes initiate outbound secure WebSocket (`wss://`) tunnels to the server.
- **Zero Database Engines:** Settings, machine lists, custom network devices, and service monitoring configurations are stored in an atomic, portable JSON format (`~/.controlcenter/settings.json`).
- **Dynamic Star Graph Topology:** Automatically matches multi-homed nodes to one or more network router CIDRs and visualizes reachable port services.
- **Built-in Web-SSH Terminal:** Full-featured xterm.js terminal with automated Ed25519 SSH keypair generation and permission setup.

---

## Core System Architecture

```
                                 ┌───────────────────────┐
                                 │   Admin Web Browser   │
                                 │   (Nuxt 3 / Vue 3)    │
                                 └───────────┬───────────┘
                                             │ HTTPS / WSS
                                             ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        ControlCenter Server (Port 4382 / HTTPS)                        │
│                                                                                        │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────────────┐  │
│  │   Auth Middleware    │  │ Daemon WSS Gateway   │  │   Interactive Web-SSH        │  │
│  │ (JWT HttpOnly Cookie)│  │    (/ws/daemon)      │  │        (/ws/ssh)             │  │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ State Persistence Layer: ~/.controlcenter/settings.json                          │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────▲────────────────────────────────────────────┘
                                            │ Outbound WSS
                                            │ (Zero-Trust)
                        ┌───────────────────┴───────────────────┐
                        │         ControlCenter.Daemon          │
                        │ (.NET Hardware Metrics & Telemetry)   │
                        └───────────────────────────────────────┘
```

---

## Key Highlights

- **Nuxt 3 & Nitro Engine:** Server-side rendered and static SPA hydration powered by H3 event handlers and ESM preloading.
- **Native Out-Of-The-Box HTTPS/WSS:** Embedded certificate manager creates and signs SSL certificates with SAN IP/DNS entries and preloads them before server startup.
- **Obsidian-Style Graph View:** HTML5 canvas with custom force-directed spring simulation, radial outward labels, and frosted text pill backdrops.
- **Multi-Homed Subnet Mapping:** Nodes matching multiple router CIDR blocks (e.g. `192.168.178.0/24` and `100.64.0.0/16`) automatically display links to all matching routers simultaneously.
