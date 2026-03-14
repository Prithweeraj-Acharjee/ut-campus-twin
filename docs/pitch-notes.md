# Pitch Notes

Quick-reference talking points for presentations and judging.

---

## One-Liner

> UT Campus Twin is a real-time digital twin for the University of Toledo that gives students live awareness of campus crowding and gives operators a command center to manage parking, incidents, and alerts — all synchronized through a single WebSocket stream.

---

## Problem

- Students waste time walking to full buildings or driving to full parking lots
- Campus operators have no centralized view of facility stress across buildings
- Events like football games, homecoming, and severe weather create sudden demand spikes with no coordinated response
- There is no real-time feedback loop between campus operations and student navigation

---

## Solution

A **digital twin** platform with two synchronized views:

| View | Audience | Purpose |
|------|----------|---------|
| Student Dashboard | Students, visitors | "Where should I go?" |
| Admin Command Center | Facilities, operations | "What's happening and what should we do?" |

Both views share the same live data stream. Admin actions instantly update the student experience.

---

## Key Differentiators

1. **Real-time, not static** — 2 Hz live updates, not a refreshed webpage
2. **Two-view architecture** — public navigation + operator control from one data source
3. **Incident simulation** — football games, homecoming, snow alerts with one click
4. **Parking advisory system** — admin marks a lot full, students instantly see the alternative
5. **Time-warp** — demo any hour of the day in real-time for judges
6. **Zero infrastructure** — runs locally, no database, no auth, no cloud dependency

---

## Technical Highlights

- **Simulation fidelity**: Gaussian-peak occupancy models per building and lot, with noise and jitter
- **Space Stress Index (SSI)**: Composite metric combining occupancy, noise, and rate-of-change
- **Admin override merge**: Non-destructive — admin state is layered on top of simulation, not replacing it
- **WebSocket pipeline**: Single broadcast serves all connected clients (student + admin)
- **Time-warp**: Judges can preview any hour without waiting — immediate visual feedback

---

## Impact Potential

- **Students**: Reduce wasted trips, find parking faster, get real-time alerts
- **Operations**: Centralized situational awareness, coordinated event response
- **Scalability**: Architecture supports real sensor data, mobile apps, and AI prediction as next steps

---

## Questions Judges Might Ask

**Q: Is the data real?**
A: The simulation uses realistic Gaussian models calibrated to UT campus patterns. The architecture supports plugging in real sensor data — the frontend doesn't care where the numbers come from.

**Q: How fast do admin actions propagate?**
A: Under 500ms. Admin POSTs update an in-memory dict, which is merged into the next WebSocket broadcast (2 Hz cycle).

**Q: Could this scale to a real campus?**
A: Yes. The backend is designed for a Redis or database swap. The WebSocket pattern scales with standard load balancing. The frontend is already responsive.

**Q: Why two views instead of one?**
A: Inspired by industrial digital twin systems (SCADA). Public users need simple navigation. Operators need dense monitoring and intervention tools. Mixing them creates confusion.
