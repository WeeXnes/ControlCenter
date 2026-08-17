# Infrastructure Topology Star Graph & Physics Engine

This document explains the Obsidian-style graph canvas, custom force-directed physics, multi-homed CIDR link resolution, and satellite service positioning.

---

## 1. Graph Architecture

The graph topology view (`/topology`) is built as a custom HTML5 canvas component (`components/InfrastructureGraph.vue`) without external graph framework bloat (such as Cytoscape, D3, or Vis.js).

### Key Component Design:
- **Direct 60 FPS Render Loop:** Utilizes `requestAnimationFrame` with double-buffered canvas rendering.
- **ResizeObserver Aspect Ratio Lock:** Dynamically syncs `canvas.width` and `canvas.height` 1:1 with container pixels to eliminate stretching, squishing, and layout shifts when inspector drawers or sidebars open.
- **Deep Space Atmosphere:** Procedural animated background stars with randomized twinkling and parallax depth.

---

## 2. Force-Directed Physics Simulation

The simulation calculates balance across several opposing vector forces:

```
┌─────────────────────────────────────────────────────────────┐
│                    Physics Vector Forces                    │
│                                                             │
│  1. Node-to-Node Repulsion: F_rep = k_rep / dist^2          │
│     (Repulsion Force: 24,000 | Max Radius: 650px)           │
│                                                             │
│  2. Link Hooke's Elasticity: F_spring = k_spring * (d - L0) │
│     (Spring Length: 230px nodes, 125px services)            │
│                                                             │
│  3. Hard Collision Separation Buffer:                       │
│     dist < (radius1 + radius2 + 65px)                       │
│                                                             │
│  4. Central Centripetal Damping & Velocity Friction (0.86)  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Multi-Homed Network & CIDR Subnet Linking

Managed nodes often possess multiple active network interfaces (e.g. `192.168.178.67` on physical LAN, `100.64.0.12` on Netmaker VPN, `172.17.0.1` on Docker).

### Subnet Resolution Algorithm (`server/util/cidrMatcher.ts` & `server/api/infrastructure/index.ts`):
1. The server compiles all unique IP addresses per node from `machine.ip` and live daemon telemetry (`telemetry.ipAddresses`).
2. For each registered router/subnet device with a CIDR (e.g. `192.168.178.0/24` or `100.64.0.0/16`):
   - The CIDR matcher converts IPv4 addresses into 32-bit integers and applies the bitmask.
   - If **ANY** IP on the node matches the device's subnet, an edge is created connecting the device to that node.
3. If a node matches multiple routers (e.g. Home LAN Router AND Netmaker VPN Hub), the node is linked to **both routers simultaneously**, forming a visual bridge between the networks.
4. Nested devices (such as a managed switch with IP `192.168.178.2`) automatically link upstream to the matching parent router.

---

## 4. Radial Satellite Service Placement & Outward Labels

Services attached to a host node (e.g. Web Server `@:1337`, PostgreSQL `@:5432`, Plex) are positioned as satellite stars around their host:
- **Radial Offset Angle:** Satellites are evenly distributed in an orbit 125px from the parent machine.
- **Outward Projecting Labels:** Label text vectors point radially away from the parent node (`angle = atan2(dy, dx)`), preventing text labels from colliding with host machine graphics.
- **Frosted Dark Pill Backdrops:** Rendered using rounded rectangle paths with `rgba(10, 15, 29, 0.85)` fill and glowing border outlines for maximum legibility over overlapping links.

---

## 5. Graph Node Disablement & Inventory List

- **Node Disablement:** Users can toggle `disabledInGraph` on any node from either the inspector drawer or the inventory table. Disabled nodes and their associated links are removed from the canvas simulation.
- **Device & Network Inventory List (`components/InfrastructureDeviceList.vue`):** Positioned below the canvas with real-time search, category filter tabs (*All*, *Machines*, *Routers/Net*, *Hidden*), live reachability badges, and 1-click camera focus.
