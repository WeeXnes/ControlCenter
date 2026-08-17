# System Architecture & Core Flow

This document details the architectural layers, data lifecycle, and backend components that comprise ControlCenter Web.

---

## 1. Architectural Layers

ControlCenter is organized into distinct, modular subsystems:

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer (SPA)                     │
│  - Vue 3 + Nuxt 3 Client Hydration                          │
│  - Tailwind CSS + DaisyUI UI Design System                  │
│  - xterm.js Web Terminal Interface                          │
│  - HTML5 Canvas Physics Engine (Obsidian Star Graph)        │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS (REST) & WSS
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Server / API Engine (Nitro)               │
│  - Nitro H3 Event Handlers (server/api/*)                   │
│  - Auth Middleware (server/middleware/auth.ts)              │
│  - Zero-Trust WebSocket Hub (server/routes/ws/daemon.ts)    │
│  - Web-SSH Bridge (server/routes/ws/ssh.ts)                 │
│  - CIDR Multi-Homed Matcher (server/util/cidrMatcher.ts)    │
│  - TCP Reachability Prober (server/util/probeHelper.ts)     │
│  - Daemon Manager (server/util/daemonManager.ts)            │
│  - SSH Key Manager (server/util/sshKeyManager.ts)           │
└──────────────────────────────┬──────────────────────────────┘
                               │ File System I/O
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Persistence Layer (Local FS)              │
│  - ~/.controlcenter/settings.json (Atomic Settings Storage) │
│  - ~/.controlcenter/certs/ (Auto-Generated SSL Cert & Key)  │
│  - ~/.ssh/ControlCenterKeys/ (Ed25519 Managed Keypairs)     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Zero-Database Storage Engine

ControlCenter intentionally eliminates external database dependencies (such as PostgreSQL, MySQL, SQLite, or Redis).

### Why File-Based JSON Storage?
- **Total Portability:** The entire application state (users, password hashes, JWT secrets, machine lists, custom routers/switches, port service monitors, and layout positions) resides in `~/.controlcenter/settings.json`.
- **Atomic Operations:** Reads and writes are managed through `util/jsonLoader.ts`. When updates occur, the in-memory `environment.settings` structure is synchronized and saved cleanly to disk.
- **Zero Configuration:** Starting a new instance requires no database migrations, schema seeding, or external container setup.

---

## 3. Native Out-of-the-Box HTTPS / WSS Preloader

In Nuxt Nitro's `node-server` preset, SSL certificates must be defined in `process.env.NITRO_SSL_CERT` and `process.env.NITRO_SSL_KEY` prior to the initialization of the primary Nitro bundle.

To ensure ControlCenter starts in secure HTTPS/WSS mode when invoked directly by `systemd` (e.g. `/usr/bin/node /opt/controlcenter/server/index.mjs`):
1. **Nitro Compiler Hook (`nuxt.config.ts`):** During the build phase, Nitro injects `import './preload-ssl.mjs';` as the very first instruction in `.output/server/index.mjs`.
2. **ESM Preload Module (`preload-ssl.mjs`):**
   - Automatically detects or creates the self-signed SSL certificate with full SAN IP and hostname mappings.
   - Sets `process.env.NITRO_SSL_CERT` and `process.env.NITRO_SSL_KEY` in memory.
   - Nitro loads `https.Server` natively, binding `https://` and `wss://` listeners on port `4382`.

---

## 4. Security Model

- **Authentication:** Password hashing via `bcryptjs` (salt rounds: 10).
- **Session Tokens:** Signed JWT tokens transmitted strictly in secure `HttpOnly`, `SameSite=Strict` browser cookies (never in request/response bodies or localStorage).
- **Endpoint Protection:** All API endpoints under `/api/*` (except `/api/auth/login`, `/api/auth/status`, and `/api/auth/setup`) are guarded by `server/middleware/auth.ts`.
- **WebSocket Handshake Validation:** Both `/ws/daemon` and `/ws/ssh` endpoints perform handshake validation before upgrading socket connections.
