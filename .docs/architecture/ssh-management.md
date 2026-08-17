# SSH Key Management & Web Terminal Architecture

This document describes the automated SSH keypair management, authentication flow, and in-browser interactive terminal over encrypted WebSockets.

---

## 1. Automated SSH Key Generation & Storage

ControlCenter manages OpenSSH keypairs directly via `server/util/sshKeyManager.ts`:
- **Algorithm:** High-security **Ed25519** (`ssh-keygen -t ed25519 -N "" -C "ControlCenter-AutoKey"`).
- **Directory:** Keypairs are stored in `~/.ssh/ControlCenterKeys/` with strict POSIX permissions (`0700` directory, `0600` private key, `0644` public key).
- **Default Key Initialization:** On first setup, ControlCenter automatically creates an initial keypair and stores the reference in `environment.settings.default_ssh_key`.

---

## 2. Web-SSH Architecture & WebSocket Bridge

The Web-SSH terminal connects the browser's `xterm.js` emulator to the target machine's OpenSSH daemon through the server's WebSocket gateway:

```
┌─────────────────────────┐                ┌─────────────────────────┐                ┌─────────────────────────┐
│       Web Browser       │  WSS (JSON)    │   ControlCenter Server  │  Raw SSH Stream│      Target Machine     │
│   (xterm.js Terminal)   ├───────────────►│  (server/routes/ws/ssh) ├───────────────►│    (sshd Port 22)       │
│  - Keystrokes & Input   │◄───────────────┤  - JWT Auth Validation  │◄───────────────┤  - Shell / PTY Output   │
│  - Window Resize (cols) │                │  - SSH2 Client Bridge   │                │                         │
└─────────────────────────┘                └─────────────────────────┘                └─────────────────────────┘
```

---

## 3. WebSocket Handshake & Authentication Protocol (`/ws/ssh`)

### Handshake & Security Verification:
1. The client opens a WebSocket connection to `wss://<server-ip>:4382/ws/ssh?machineId=<uuid>`.
2. The server extracts the `token` cookie or bearer token from the upgrade request and verifies the signature using the internal JWT secret.
3. The server locates the machine definition in `settings.json`. If unauthenticated or nonexistent, the socket is immediately closed with an error frame.

### Message Framing:
- **Client Input / Keystrokes:** Sent as text frames or JSON payloads `{ type: 'data', data: '...' }`.
- **Window Resize (PTY resize):** Sent as JSON payload `{ type: 'resize', cols: 120, rows: 35 }`.
- **Terminal Output:** Streamed as binary or text data directly from SSH PTY stdout/stderr to xterm.js.

---

## 4. SSH Authentication Methods

ControlCenter supports two SSH connection strategies per node:
1. **Public Key Authentication (Recommended):** Uses the private key file configured on the machine (e.g. `~/.ssh/ControlCenterKeys/id_ed25519`).
2. **Password Authentication:** Securely transmits password credentials in memory to initialize the SSH session.
