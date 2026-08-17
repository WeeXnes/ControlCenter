# API Reference: WebSocket Endpoints

ControlCenter utilizes two encrypted WebSocket endpoints for node telemetry and in-browser interactive terminal sessions.

---

## 1. `/ws/daemon` (Zero-Trust Node Telemetry Hub)

The gateway endpoint connecting instances of `controlcenter-daemon`.

### Protocol & Connection URL
```
wss://<server-ip>:4382/ws/daemon?machineId=<uuid>&token=<apiKey>&name=<hostname>
```

### Query Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `machineId` | string (UUID) | Unique hardware ID identifying the client node. |
| `token` | string (Optional) | Pre-shared API key / authentication token. |
| `name` | string (Optional) | Client hostname. |

### Message Types (Server $\rightarrow$ Client)
- `{ type: "auth_success" }`: Connection approved; start streaming telemetry.
- `{ type: "auth_pending", message: "..." }`: Node auto-enrolled; waiting for admin approval.
- `{ type: "auth_error", message: "..." }`: Rejected authentication; connection closed.

### Message Types (Client $\rightarrow$ Server)
- `{ type: "telemetry", machineId: "...", data: { cpu, ram, disks, network, processes } }`: Streamed every 2 seconds.

---

## 2. `/ws/ssh` (Interactive Web-SSH Bridge)

The gateway endpoint connecting the browser's `xterm.js` terminal emulator to target node SSH daemons.

### Protocol & Connection URL
```
wss://<server-ip>:4382/ws/ssh?machineId=<uuid>
```

### Authentication
Requires valid admin session cookie (`token=<jwt>`).

### Client $\rightarrow$ Server Messages
- `string`: Raw terminal keyboard input / keystrokes.
- `{ type: "resize", cols: number, rows: number }`: Updates the remote PTY window dimensions.

### Server $\rightarrow$ Client Messages
- `binary` / `string`: Real-time PTY stdout and stderr output stream.
