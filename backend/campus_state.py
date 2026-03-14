"""
campus_state.py
---------------
Holds the single mutable global campus state dict that the simulator
writes to and the WebSocket broadcaster reads from.

Keeping it in a separate module avoids circular imports between
main.py (FastAPI) and any future modules that need to read state.
"""

from typing import Any, Dict

# The simulator updates this in-place on every tick.
# WebSocket clients receive a JSON snapshot of this dict.
campus_state: Dict[str, Any] = {}

# ── Admin overrides ──────────────────────────────────────────────────────────
# Separate dict so admin actions persist across simulator ticks.
# Merged into campus_state before every WebSocket broadcast.
admin_overrides: Dict[str, Any] = {
    "global_alert": "",
    "active_incident": None,       # "football_game" | "homecoming" | "snow_alert" | None
    "parking_overrides": {},       # key → {operational_status, recommended_alternative, advisory_message}
    "building_overrides": {},      # key → {operational_status, override_active}
}


def merge_admin_overrides(snapshot: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge admin overrides into a simulator snapshot (non-destructive).
    Returns a new dict safe to broadcast.
    """
    out = {**snapshot}

    # Top-level admin fields
    out["global_alert"] = admin_overrides.get("global_alert", "")
    out["active_incident"] = admin_overrides.get("active_incident")

    # Per-parking-lot overrides
    p_overrides = admin_overrides.get("parking_overrides", {})
    if "parking" in out:
        merged_parking = {}
        for lot_key, lot_data in out["parking"].items():
            lot = {**lot_data}
            if lot_key in p_overrides:
                ov = p_overrides[lot_key]
                lot["operational_status"] = ov.get("operational_status", "open")
                lot["recommended_alternative"] = ov.get("recommended_alternative", "")
                lot["advisory_message"] = ov.get("advisory_message", "")
                lot["override_active"] = True
            else:
                lot["operational_status"] = "open"
                lot["recommended_alternative"] = ""
                lot["advisory_message"] = ""
                lot["override_active"] = False
            merged_parking[lot_key] = lot
        out["parking"] = merged_parking

    # Per-building overrides
    b_overrides = admin_overrides.get("building_overrides", {})
    if "locations" in out:
        merged_locs = {}
        for loc_key, loc_data in out["locations"].items():
            loc = {**loc_data}
            if loc_key in b_overrides:
                ov = b_overrides[loc_key]
                loc["operational_status"] = ov.get("operational_status", "online")
                loc["override_active"] = True
            else:
                loc["operational_status"] = "online"
                loc["override_active"] = False
            merged_locs[loc_key] = loc
        out["locations"] = merged_locs

    return out
