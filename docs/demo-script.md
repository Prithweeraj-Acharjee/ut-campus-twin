# Demo Script

A 3–5 minute walkthrough for judges or live demos.

---

## Setup

1. Start backend: `python run.py` (from project root)
2. Start frontend: `cd frontend && npm run dev`
3. Open two browser tabs:
   - **Student Dashboard**: `http://localhost:3000`
   - **Admin Portal**: `http://localhost:3000/admin`

Arrange tabs side-by-side for maximum impact.

---

## Act 1 — Student Dashboard (1 min)

> "This is the student-facing view. It shows real-time building crowding and parking availability across campus."

1. **Point out the live clock** in the header — time is simulated at 10x speed
2. **Show building cards** — each shows occupancy %, SSI gauge, and resource availability
3. **Show parking section** — 5 lots with fill bars and estimated free spots
4. **Drag the time-warp slider** to noon → watch buildings and parking fill up
5. **Drag to 6:30 PM** → watch Rec Center spike to critical, parking lots fill
6. **Click Resume Live** to return to normal flow

> "Students can see at a glance where to go and where to avoid."

---

## Act 2 — Admin Command Center (2 min)

> "Now let's switch to the operator view. This is the campus facilities control center."

### 2a. Facilities Monitor
1. Show the **buildings table** — SSI, trend arrows, occupancy bars, operational status
2. Click **Override** on Carlson Library → set to **Maintenance** → Apply
3. Switch to student tab → show the **Maintenance badge** on the Library card and the **recommendation banner**

### 2b. Parking Control
1. Show the **parking table** with all 5 lots
2. Click **Update Advisory** on Academic Core Lot
3. Set to **Full**, pick **North Engineering Lot** as alternative
4. Type advisory: "Lot is full due to event traffic. Use North Engineering Lot."
5. Apply → switch to student tab → show the advisory banner and recommended lot on the parking card

### 2c. Incident Simulation
1. Click **Football Game** → watch:
   - Global alert banner appears on both views
   - Academic Core marked "Event Reserved"
   - Student Union Lot marked "Full"
   - Student view shows all advisories instantly
2. Click **Clear All Incident Overrides** → everything resets

### 2d. Global Alert
1. Type: "Severe weather approaching — seek shelter immediately"
2. Click **Broadcast Alert** → red banner appears on student dashboard
3. Click **Clear Alert** → banner disappears

> "Every action the admin takes is reflected in under half a second on the student view — through the same WebSocket stream."

---

## Act 3 — Closing (30 sec)

> "UT Campus Twin gives students real-time awareness and gives operators real-time control — all through a single digital twin pipeline. No polling, no refresh — just live data."

Key talking points:
- **Single source of truth** — one state, two views
- **Instant sync** — WebSocket at 2 Hz
- **Realistic simulation** — Gaussian occupancy models with SSI/PSI
- **Hackathon-ready** — no external databases, no auth overhead, runs locally

---

## Emergency Recovery

If something breaks during the demo:

- **Frontend not loading?** Check that backend is running (`python run.py`)
- **WebSocket disconnected?** It auto-reconnects in 2 seconds — just wait
- **Admin overrides stuck?** POST to `/admin/incident` with `{"incident": null}` to clear all
- **Time-warp stuck?** Click "Resume Live" on the student dashboard
