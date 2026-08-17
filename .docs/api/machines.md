# API Reference: Machines & Nodes

Endpoints for managing enrolled machines, approval state, live statistics, reordering, and machine execution actions.

---

## `GET /api/machines`

Retrieves all configured machines along with live connection status and cached telemetry.

### Authentication
- **Required:** Yes

### Response
```json
[
  {
    "id": "495f5683-1b75-467f-b2d9-bab73f2e60a6",
    "name": "S2600CP",
    "ip": "100.64.0.4",
    "daemonPort": 4382,
    "sshPort": 22,
    "sshUser": "root",
    "sshAuthType": "key",
    "sshKeyFile": "/home/weexnes/.ssh/ControlCenterKeys/id_ed25519",
    "status": "approved",
    "online": true,
    "telemetry": {
      "cpuUsagePercent": 12.4,
      "ramUsagePercent": 38.1,
      "uptimeSeconds": 182390
    }
  }
]
```

---

## `POST /api/machines/[id]/approve`

Approves a new node that connected via zero-trust auto-enrollment.

### Authentication
- **Required:** Yes

### Response
```json
{
  "success": true,
  "message": "Machine approved successfully."
}
```

---

## `GET /api/machines/[id]/stats`

Retrieves detailed live telemetry (disks, processes, network interface bandwidth) for a specific machine.

### Authentication
- **Required:** Yes

### Response
```json
{
  "online": true,
  "stats": {
    "os": "Linux 6.10.3-arch1-1",
    "cpuUsagePercent": 8.4,
    "ramUsagePercent": 41.2,
    "disks": [
      { "mount": "/", "totalGigabytes": 915.8, "usedGigabytes": 234.1 }
    ],
    "processes": [
      { "name": "node", "pid": 2046260, "cpuPercent": 2.1, "ramBytes": 84934656 }
    ]
  }
}
```

---

## `POST /api/machines/reorder`

Updates the display order of machines on the dashboard.

### Authentication
- **Required:** Yes

### Request Body
```json
{
  "orderedIds": [
    "495f5683-1b75-467f-b2d9-bab73f2e60a6",
    "e2bc7986-0bd8-4377-9e9c-af0fb00921cf"
  ]
}
```
