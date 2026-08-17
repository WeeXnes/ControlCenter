# API Reference: Infrastructure & Topology

Endpoints for fetching computed star graph topologies, managing custom network devices (routers, switches, firewalls, subnets), attached port services, TCP reachability probes, and graph visibility toggles.

---

## `GET /api/infrastructure`

Calculates and returns the entire topology graph: active machines, custom devices, attached services, resolved multi-homed links, and canvas positions.

### Authentication
- **Required:** Yes

### Response
```json
{
  "machines": [
    {
      "id": "495f5683-1b75-467f-b2d9-bab73f2e60a6",
      "name": "S2600CP",
      "ip": "100.64.0.4",
      "ipAddresses": ["192.168.178.67", "100.64.0.4"],
      "type": "machine",
      "online": true,
      "disabledInGraph": false,
      "services": []
    }
  ],
  "devices": [
    {
      "id": "d1-router",
      "name": "Fritz!Box",
      "type": "router",
      "cidr": "192.168.178.0/24",
      "disabledInGraph": false
    }
  ],
  "links": [
    {
      "source": "d1-router",
      "target": "495f5683-1b75-467f-b2d9-bab73f2e60a6",
      "type": "cidr",
      "label": "192.168.178.0/24"
    }
  ],
  "disabledNodes": []
}
```

---

## `POST /api/infrastructure`

Creates a new custom infrastructure device (Router, Switch, Gateway, Firewall, Subnet).

### Authentication
- **Required:** Yes

### Request Body
```json
{
  "name": "Netmaker VPN Mesh",
  "type": "router",
  "ip": "100.64.0.1",
  "cidr": "100.64.0.0/16",
  "description": "Wireguard mesh overlay network"
}
```

---

## `POST /api/infrastructure/toggle`

Toggles or sets the visibility of a machine or device in the topology star graph.

### Authentication
- **Required:** Yes

### Request Body
```json
{
  "nodeId": "495f5683-1b75-467f-b2d9-bab73f2e60a6",
  "disabled": true
}
```

### Response
```json
{
  "success": true,
  "nodeId": "495f5683-1b75-467f-b2d9-bab73f2e60a6",
  "disabled": true,
  "disabledNodes": ["495f5683-1b75-467f-b2d9-bab73f2e60a6"]
}
```

---

## `POST /api/infrastructure/services`

Attaches a monitored port service or Public Domain URL to a node. Automatically triggers an initial reachability probe.

### Authentication
- **Required:** Yes

### Request Body
```json
{
  "nodeId": "495f5683-1b75-467f-b2d9-bab73f2e60a6",
  "name": "ControlCenter Web",
  "port": 4382,
  "protocol": "https",
  "publicUrl": "https://controlcenter.mydomain.com"
}
```

---

## `POST /api/infrastructure/probe`

Executes a live TCP socket / HTTP reachability test against a target host and port. Persists the result (`status`, `latencyMs`, `lastChecked`) into `settings.json`.

### Authentication
- **Required:** Yes

### Request Body
```json
{
  "nodeId": "495f5683-1b75-467f-b2d9-bab73f2e60a6",
  "serviceId": "s1",
  "host": "100.64.0.4",
  "port": 4382,
  "protocol": "https"
}
```

### Response
```json
{
  "reachable": true,
  "latencyMs": 4,
  "timestamp": "2026-08-17T02:00:00.000Z"
}
```
