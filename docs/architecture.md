# System Architecture

## Overview

UT Campus Twin is a real-time campus digital twin with two views:

- **Student Dashboard** — public-facing awareness and navigation
- **Admin Command Center** — operator-facing monitoring and intervention

Both views share a single WebSocket data stream, ensuring instant synchronization.

## Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    CampusSimulator                            │
│              (Gaussian-peak occupancy models)                 │
│         4 buildings  ·  5 parking zones  ·  SSI/PSI          │
└────────────────────────┬─────────────────────────────────────┘
                         │ tick every 0.5s
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                   FastAPI Backend (main.py)                   │
│                                                              │
│  ┌─────────────┐    ┌──────────────────┐                    │
│  │  Simulator   │───▶│  campus_state    │◀── Admin Overrides │
│  │  .tick()     │    │  (merged dict)   │    (parking, bldg, │
│  └─────────────┘    └────────┬─────────┘     alerts, events) │
│                              │                               │
│              WebSocket /ws   │   REST /admin/*                │
│              (2 Hz broadcast)│   (POST endpoints)            │
└──────────────────────────────┼───────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                                 ▼
┌─────────────────────────┐   ┌─────────────────────────────┐
│   Student Dashboard     │   │   Admin Command Center      │
│   (Next.js — /)         │   │   (Next.js — /admin)        │
│                         │   │                             │
│  • Building status      │   │  • Facilities table         │
│  • Parking overview     │   │  • Parking control          │
│  • Recommendations      │   │  • Incident simulation      │
│  • Time-warp slider     │   │  • Global alert broadcast   │
│  • Global alert banner  │   │  • Override management      │
└─────────────────────────┘   └─────────────────────────────┘
```

## Simulation Engine

The simulator generates realistic occupancy using **sum-of-Gaussians** models:

- Each building has 2–3 peaks defined by (center_hour, amplitude, width)
- Occupancy is clamped to operating hours with small random jitter
- **Space Stress Index (SSI)** = `0.7 × occupancy² + 0.2 × noise + 0.1 × rate_of_change`
- **Parking Stress Index (PSI)** = `occupied / capacity`

Simulated time runs at **10 sim-minutes per real second** within the 8 AM – 10 PM window.

## Admin Override System

Admin actions are stored in a separate `admin_overrides` dict, merged into the simulator snapshot before every broadcast:

- **Parking overrides**: operational_status, recommended_alternative, advisory_message
- **Building overrides**: operational_status (online/maintenance/emergency/closed)
- **Global alert**: free-text campus-wide message
- **Incident presets**: football game, homecoming, snow alert — each applies a bundle of overrides

This design means admin actions are **instantly visible** to all connected clients (student and admin) without any polling or refresh.

## Tech Stack

| Layer     | Technology       | Purpose                      |
|-----------|------------------|------------------------------|
| Backend   | Python + FastAPI | REST + WebSocket server      |
| Simulator | Pure Python      | Occupancy + stress modeling  |
| Frontend  | Next.js 14       | App Router, React 18         |
| Icons     | lucide-react     | Consistent icon system       |
| Styling   | CSS variables     | UT-branded dark theme        |
| State     | In-memory dict   | Single source of truth       |

## Key Endpoints

| Method | Path              | Purpose                          |
|--------|-------------------|----------------------------------|
| WS     | `/ws`             | Live state stream (2 Hz)         |
| GET    | `/state`          | REST state snapshot              |
| GET    | `/health`         | Liveness probe                   |
| POST   | `/time-warp`      | Set/release simulated time       |
| POST   | `/admin/parking`  | Set parking lot override         |
| POST   | `/admin/override` | Set building operational status  |
| POST   | `/admin/alert`    | Broadcast/clear global alert     |
| POST   | `/admin/incident` | Trigger/clear incident scenario  |
| GET    | `/admin/state`    | Read current admin overrides     |
