# UT Campus Twin

**Real-time digital twin for the University of Toledo campus.**

A live monitoring and control platform that gives students real-time awareness of building crowding and parking availability, and gives campus operators a command center to manage incidents, parking advisories, and global alerts — all synchronized through a single WebSocket stream.

---

## Problem

Campus congestion is a daily challenge:

- Students walk to buildings only to find them at capacity
- Drivers circle full parking lots with no guidance on alternatives
- Events like football games and homecoming create sudden demand spikes
- Severe weather disrupts operations with no coordinated communication
- There is no real-time feedback loop between facilities teams and students

## Solution

UT Campus Twin provides a **dual-view digital twin**:

| View | Audience | Purpose |
|------|----------|---------|
| **Student Dashboard** | Students, visitors | "Where should I go?" |
| **Admin Command Center** | Facilities, operations | "What's happening and what should we do?" |

Both views share the same live data stream. Every admin action — marking a lot full, triggering an incident, broadcasting an alert — is reflected on the student dashboard in under 500ms.

---

## Features

### Student Dashboard
- Real-time building occupancy with **Space Stress Index (SSI)**
- Parking availability across 5 campus zones with fill bars and spot estimates
- Smart recommendations when buildings or lots reach critical levels
- **Time-warp slider** to preview campus conditions at any hour (8 AM – 10 PM)
- Global alert banner for campus-wide messages
- Google Maps parking visualization (optional, with API key)

### Admin Command Center
- Dense facilities monitoring table (SSI, trend, occupancy, operational status)
- Parking control panel — mark lots as Full / Closed / Event Reserved / Maintenance
- **Recommended alternative parking** with advisory messages
- **Incident simulation** — Football Game, Homecoming, Severe Snow Alert
- Global alert broadcast system
- Building override controls (Maintenance / Emergency / Closed)

### Parking Advisory System
1. Admin marks a lot (e.g., Academic Core) as **Full**
2. Admin selects an alternative (e.g., North Engineering Lot)
3. Admin writes an advisory message
4. Student dashboard instantly shows:
   - "Lot Full" badge on the parking card
   - Advisory message explaining why
   - "Recommended: North Engineering Lot" with a pin icon

### Incident Simulation
One-click event triggers that apply realistic bundles of parking overrides and global alerts:

| Incident | Effect |
|----------|--------|
| **Football Game** | Stadium-area lots reserved, traffic advisory |
| **Homecoming** | Multiple lots reserved, campus-wide demand increase |
| **Snow Alert** | Lots closed/reduced, building maintenance, weather advisory |

---

## System Architecture

```
Simulator (Gaussian occupancy models)
        │
        ▼  tick every 0.5s
FastAPI Backend ◄── Admin Override POST endpoints
        │
        ▼  WebSocket /ws (2 Hz)
   ┌────┴────┐
   ▼         ▼
Student    Admin
Dashboard  Command Center
```

The simulation engine generates realistic occupancy using sum-of-Gaussians models for 4 buildings and 5 parking zones. Admin overrides are merged non-destructively into the state before every broadcast.

> See [docs/architecture.md](docs/architecture.md) for the full technical breakdown.

---

## Screenshots

> *Replace these placeholders with actual screenshots before submission.*

| Student Dashboard | Admin Command Center |
|:-:|:-:|
| ![Student Dashboard](docs/screenshots/student-dashboard.png) | ![Admin Portal](docs/screenshots/admin-portal.png) |

| Parking Map | Incident Simulation |
|:-:|:-:|
| ![Parking Map](docs/screenshots/parking-map.png) | ![Incident Control](docs/screenshots/incident-control.png) |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend | Python, FastAPI | REST + WebSocket server |
| Simulation | Pure Python | Gaussian occupancy + SSI/PSI |
| Frontend | Next.js 14, React 18 | App Router, client components |
| Icons | lucide-react | Consistent icon system |
| Styling | CSS custom properties | UT-branded dark theme |
| State | In-memory dict | Single source of truth |

---

## Project Structure

```
smart-campus-twin/
├── backend/
│   ├── main.py              # FastAPI server + admin endpoints
│   ├── simulator.py         # Campus simulation engine
│   └── campus_state.py      # In-memory state + admin overrides
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx           # Student Dashboard route
│   │   │   ├── admin/page.tsx     # Admin Portal route
│   │   │   ├── layout.tsx         # Root layout
│   │   │   └── globals.css        # UT-branded theme
│   │   ├── components/
│   │   │   ├── Dashboard.tsx      # Student dashboard
│   │   │   ├── AdminPortal.tsx    # Admin command center
│   │   │   ├── LocationCard.tsx   # Building status card
│   │   │   ├── ParkingCard.tsx    # Parking overview
│   │   │   ├── ParkingMap.tsx     # Google Maps visualization
│   │   │   ├── RecommendationBanner.tsx  # Alert banners
│   │   │   └── OnboardingModal.tsx       # Welcome modal
│   │   └── hooks/
│   │       └── useCampusSocket.ts # WebSocket hook + types
│   ├── public/
│   │   └── utoledo-logo.png
│   └── package.json
├── docs/
│   ├── architecture.md      # Technical architecture
│   ├── demo-script.md       # 3–5 min demo walkthrough
│   └── pitch-notes.md       # Talking points for judges
├── run.py                   # Backend entry point
├── requirements.txt         # Python dependencies
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm

### Backend

```bash
# From project root
pip install -r requirements.txt
python run.py
```

The API server starts at `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app starts at `http://localhost:3000`.

### Optional: Google Maps

To enable the interactive parking map, add your API key to `frontend/.env.local`:

```
NEXT_PUBLIC_GMAPS_KEY=your_api_key_here
```

Without it, the parking map falls back to a styled table view.

---

## Demo Views

| Route | View |
|-------|------|
| `http://localhost:3000` | Student Dashboard |
| `http://localhost:3000/admin` | Admin Command Center |

Click the **Admin** button in the student dashboard header to navigate to the admin portal.

> See [docs/demo-script.md](docs/demo-script.md) for a full walkthrough.

---

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| WS | `/ws` | Live state stream (2 Hz) |
| GET | `/state` | REST state snapshot |
| GET | `/health` | Liveness probe |
| POST | `/time-warp` | Set/release simulated time |
| POST | `/admin/parking` | Set parking lot override |
| POST | `/admin/override` | Set building operational status |
| POST | `/admin/alert` | Broadcast/clear global alert |
| POST | `/admin/incident` | Trigger/clear incident scenario |

---

## Future Improvements

- **Redis-backed state** for persistence and multi-instance scaling
- **Real sensor integration** — IoT occupancy counters, parking gate data
- **Mobile navigation** — turn-by-turn directions to recommended alternatives
- **AI parking prediction** — ML models forecasting lot fill times
- **Role-based authentication** — secure admin access
- **Historical analytics** — trend dashboards for facilities planning

---

## License

MIT

---

*Built for the University of Toledo — Go Rockets!*
