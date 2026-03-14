"""
Smart Campus Digital Twin — FastAPI Backend
============================================
Mirrors the ConservaTwin architecture:

  asyncio loop  →  simulator.tick()  →  campus_state  →  WebSocket broadcast

Endpoints
---------
  WS   /ws           live campus state at 2 updates/second
  GET  /state        REST polling fallback (returns current campus_state)
  GET  /health       liveness probe
  POST /time-warp    set or release simulated time (demo slider)
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.simulator import CampusSimulator
import backend.campus_state as cs
from backend.campus_state import merge_admin_overrides

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s: %(message)s")
log = logging.getLogger("campus.backend")

# ── Global objects ─────────────────────────────────────────────────────────────
simulator: CampusSimulator = None
ws_clients: List[WebSocket] = []

BROADCAST_HZ   = 2          # updates per second
BROADCAST_INTERVAL = 1.0 / BROADCAST_HZ   # 0.5 s


# ── WebSocket broadcast ────────────────────────────────────────────────────────
async def _broadcast(payload: str) -> None:
    """Send payload to every connected client; remove dead sockets."""
    dead = []
    for ws in ws_clients:
        try:
            await ws.send_text(payload)
        except Exception:
            dead.append(ws)
    for ws in dead:
        ws_clients.remove(ws)


# ── Simulator loop ─────────────────────────────────────────────────────────────
async def _sim_loop() -> None:
    """
    Core loop — runs for the lifetime of the server.

    Every BROADCAST_INTERVAL seconds:
      1. tick the simulator (advances simulated clock)
      2. compute the new campus state snapshot
      3. store it in campus_state module-level dict
      4. broadcast JSON to all connected WebSocket clients
    """
    prev_time = time.monotonic()
    while True:
        await asyncio.sleep(BROADCAST_INTERVAL)

        now = time.monotonic()
        dt  = now - prev_time
        prev_time = now

        simulator.tick(dt)
        snapshot = simulator.get_state()

        # Merge admin overrides into the snapshot before broadcast
        merged = merge_admin_overrides(snapshot)

        # Update global state (in-place keeps the reference stable)
        cs.campus_state.clear()
        cs.campus_state.update(merged)

        if ws_clients:
            await _broadcast(json.dumps(merged))


# ── FastAPI lifespan ──────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global simulator
    simulator = CampusSimulator(seed=42)

    # Seed campus_state so /state works even before first tick
    cs.campus_state.update(simulator.get_state())

    task = asyncio.create_task(_sim_loop())
    log.info("Smart Campus Digital Twin  — ONLINE  (http://localhost:8000)")
    yield
    task.cancel()
    log.info("Smart Campus Digital Twin  — OFFLINE")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Smart Campus Digital Twin",
    description="University of Toledo — real-time campus occupancy twin",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── WebSocket  /ws ─────────────────────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket) -> None:
    await ws.accept()
    ws_clients.append(ws)
    log.info(f"WS connected  — {len(ws_clients)} client(s)")

    # Send current snapshot immediately so UI doesn't wait 0.5 s
    if cs.campus_state:
        await ws.send_text(json.dumps(cs.campus_state))

    try:
        while True:
            msg = await ws.receive_text()
            if msg == "ping":
                await ws.send_text('{"type":"pong"}')
    except WebSocketDisconnect:
        ws_clients.remove(ws)
        log.info(f"WS disconnected — {len(ws_clients)} client(s)")


# ── REST  GET /state ───────────────────────────────────────────────────────────
@app.get("/state")
async def get_state():
    """Return current campus state as JSON (REST fallback)."""
    return cs.campus_state


# ── REST  GET /health ──────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status":      "ok",
        "sim_time":    simulator.sim_time_str if simulator else "—",
        "time_warp":   simulator._time_warp_active if simulator else False,
        "ws_clients":  len(ws_clients),
    }


# ── REST  POST /time-warp ──────────────────────────────────────────────────────
class TimeWarpBody(BaseModel):
    hour:   float         # simulated hour to jump to  (0 – 23.99)
    active: bool = True   # False = release warp, resume normal flow


@app.post("/time-warp")
async def time_warp(body: TimeWarpBody):
    """
    Demo time-warp endpoint consumed by the frontend slider.

    Examples
    --------
    Set to noon:   POST /time-warp  {"hour": 12.0, "active": true}
    Release warp:  POST /time-warp  {"hour": 0,    "active": false}
    """
    if not simulator:
        return {"ok": False, "error": "simulator not running"}

    if body.active:
        simulator.set_sim_hour(body.hour)
    else:
        simulator.release_warp()

    return {
        "ok":       True,
        "active":   simulator._time_warp_active,
        "sim_time": simulator.sim_time_str,
        "sim_hour": round(simulator._hour, 2),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

# ── Parking override ─────────────────────────────────────────────────────────
class ParkingOverrideBody(BaseModel):
    lot_key:                  str          # e.g. "academic_core"
    operational_status:       str          # "open" | "full" | "closed" | "event_reserved" | "maintenance"
    recommended_alternative:  str = ""     # lot key or friendly name
    advisory_message:         str = ""     # free-text advisory

@app.post("/admin/parking")
async def admin_parking(body: ParkingOverrideBody):
    """Set or clear a parking lot override."""
    if body.operational_status == "open":
        # Clear override for this lot
        cs.admin_overrides["parking_overrides"].pop(body.lot_key, None)
    else:
        cs.admin_overrides["parking_overrides"][body.lot_key] = {
            "operational_status":      body.operational_status,
            "recommended_alternative": body.recommended_alternative,
            "advisory_message":        body.advisory_message,
        }
    return {"ok": True, "parking_overrides": cs.admin_overrides["parking_overrides"]}


# ── Building override ────────────────────────────────────────────────────────
class BuildingOverrideBody(BaseModel):
    building_key:        str       # e.g. "rec_center", "library"
    operational_status:  str       # "online" | "maintenance" | "emergency" | "closed"

@app.post("/admin/override")
async def admin_override(body: BuildingOverrideBody):
    """Set or clear a building operational status override."""
    if body.operational_status == "online":
        cs.admin_overrides["building_overrides"].pop(body.building_key, None)
    else:
        cs.admin_overrides["building_overrides"][body.building_key] = {
            "operational_status": body.operational_status,
            "override_active":   True,
        }
    return {"ok": True, "building_overrides": cs.admin_overrides["building_overrides"]}


# ── Global alert ─────────────────────────────────────────────────────────────
class AlertBody(BaseModel):
    message: str = ""   # empty string = clear alert

@app.post("/admin/alert")
async def admin_alert(body: AlertBody):
    """Set or clear the campus-wide alert banner."""
    cs.admin_overrides["global_alert"] = body.message.strip()
    return {"ok": True, "global_alert": cs.admin_overrides["global_alert"]}


# ── Incident trigger ─────────────────────────────────────────────────────────
INCIDENT_PRESETS = {
    "football_game": {
        "alert": "Football game traffic advisory: avoid stadium-area lots after 4 PM.",
        "parking": {
            "academic_core":     {"operational_status": "event_reserved", "recommended_alternative": "north_engineering",  "advisory_message": "Reserved for game-day operations. Use North Engineering Lot."},
            "student_union_lot": {"operational_status": "full",          "recommended_alternative": "rec_center_lot",     "advisory_message": "Heavy game-day traffic. Use Rec Center Lot."},
        },
    },
    "homecoming": {
        "alert": "Homecoming weekend: expect increased campus traffic and parking demand.",
        "parking": {
            "academic_core":     {"operational_status": "event_reserved", "recommended_alternative": "north_engineering",  "advisory_message": "Reserved for Homecoming events. Use North Engineering Lot."},
            "student_union_lot": {"operational_status": "event_reserved", "recommended_alternative": "library_lot",        "advisory_message": "Reserved for Homecoming. Use Library Zone Lot."},
            "rec_center_lot":    {"operational_status": "full",           "recommended_alternative": "north_engineering",  "advisory_message": "High Homecoming demand. Use North Engineering Lot."},
        },
    },
    "snow_alert": {
        "alert": "Severe snow alert: use designated cleared parking only. Drive carefully.",
        "parking": {
            "rec_center_lot":    {"operational_status": "closed",      "recommended_alternative": "academic_core",      "advisory_message": "Closed due to snow. Use Academic Core Lot (cleared)."},
            "north_engineering": {"operational_status": "maintenance", "recommended_alternative": "library_lot",         "advisory_message": "Reduced capacity — snow clearing in progress. Use Library Zone."},
        },
        "buildings": {
            "rec_center": {"operational_status": "maintenance"},
        },
    },
}

class IncidentBody(BaseModel):
    incident: str | None = None   # "football_game" | "homecoming" | "snow_alert" | None (clear)

@app.post("/admin/incident")
async def admin_incident(body: IncidentBody):
    """Activate or clear a pre-defined campus incident scenario."""
    if body.incident is None or body.incident == "":
        # Clear all incident-related overrides
        cs.admin_overrides["active_incident"] = None
        cs.admin_overrides["global_alert"] = ""
        cs.admin_overrides["parking_overrides"] = {}
        cs.admin_overrides["building_overrides"] = {}
        return {"ok": True, "active_incident": None}

    preset = INCIDENT_PRESETS.get(body.incident)
    if not preset:
        return {"ok": False, "error": f"Unknown incident: {body.incident}"}

    cs.admin_overrides["active_incident"] = body.incident
    cs.admin_overrides["global_alert"] = preset.get("alert", "")
    cs.admin_overrides["parking_overrides"] = {**preset.get("parking", {})}
    cs.admin_overrides["building_overrides"] = {**preset.get("buildings", {})}
    return {"ok": True, "active_incident": body.incident}


# ── Admin state read (convenience) ───────────────────────────────────────────
@app.get("/admin/state")
async def admin_state():
    """Return current admin overrides for the admin portal."""
    return cs.admin_overrides
