"""
Smart Campus Digital Twin — Simulator
======================================
Generates realistic time-based occupancy for three University of Toledo
campus facilities using Gaussian-peak sine patterns.

Simulated time:  1 real second = 10 simulated minutes
Update rate:     called every 0.5 s by the backend loop

Facilities
----------
  Rec Center     — peaks: early morning (~7 AM) and late afternoon (~5 PM)
  Carlson Library — peaks: midday (~12 PM) and evening (~8 PM)
  Student Union   — peak:  lunchtime (~12 PM)

Space Stress Index (SSI)
------------------------
  SSI = (0.7 * occupancy_ratio²) + (0.2 * normalized_noise) + (0.1 * rate_of_change)

  0.00 – 0.40  →  low       (green)
  0.40 – 0.70  →  moderate  (yellow)
  0.70 – 0.85  →  high      (orange)
  0.85 – 1.00  →  critical  (red)
"""

from __future__ import annotations

import math
import random
from typing import Dict, Any

# ── Time constants ─────────────────────────────────────────────────────────────
SIM_MINUTES_PER_REAL_SECOND: float = 10.0   # 1 real s → 10 sim min

# Demo window — simulator stays within this range and wraps at close
DEMO_OPEN_H:  float = 8.0    # 8:00 AM
DEMO_CLOSE_H: float = 22.0   # 10:00 PM


class CampusSimulator:
    """
    Drives occupancy simulation for the three campus locations.

    Usage
    -----
        sim = CampusSimulator()
        sim.tick(0.5)          # advance by 0.5 real seconds
        state = sim.get_state()
    """

    def __init__(self, seed: int = 42) -> None:
        self._rng = random.Random(seed)
        # Start at 08:00 AM simulated time
        self._sim_minutes: float = 8.0 * 60.0
        self._time_warp_active: bool = False
        # Track previous occupancy to compute rate-of-change for SSI
        self._prev: Dict[str, float] = {"rec": 0.0, "lib": 0.0, "union": 0.0, "ne_bldg": 0.0}
        self._tick_count: int = 0

    # ── Clock ──────────────────────────────────────────────────────────────────

    def tick(self, dt_real: float) -> None:
        """Advance simulated clock by dt_real real seconds (skipped during warp).
        Wraps at DEMO_CLOSE_H back to DEMO_OPEN_H so time stays in demo window."""
        if not self._time_warp_active:
            self._sim_minutes += dt_real * SIM_MINUTES_PER_REAL_SECOND
        # Keep clock within demo window
        if self._sim_minutes >= DEMO_CLOSE_H * 60.0:
            self._sim_minutes = DEMO_OPEN_H * 60.0
        elif self._sim_minutes < DEMO_OPEN_H * 60.0:
            self._sim_minutes = DEMO_OPEN_H * 60.0
        self._tick_count += 1

    def set_sim_hour(self, hour: float) -> None:
        """Pin the simulated clock to the given hour. Clamps to demo window."""
        clamped = max(DEMO_OPEN_H, min(DEMO_CLOSE_H - 0.01, hour))
        self._sim_minutes = clamped * 60.0
        self._time_warp_active = True

    def release_warp(self) -> None:
        """Resume normal clock progression from the current pinned position."""
        self._time_warp_active = False

    # ── Helpers ────────────────────────────────────────────────────────────────

    @property
    def _hour(self) -> float:
        return self._sim_minutes / 60.0

    @property
    def sim_time_str(self) -> str:
        h = int(self._sim_minutes // 60) % 24
        m = int(self._sim_minutes % 60)
        suffix = "AM" if h < 12 else "PM"
        return f"{h % 12 or 12:02d}:{m:02d} {suffix}"

    @staticmethod
    def _gaussian(x: float, center: float, amplitude: float, width: float) -> float:
        return amplitude * math.exp(-0.5 * ((x - center) / width) ** 2)

    def _occupancy(
        self,
        hour: float,
        peaks: list[tuple[float, float, float]],
        open_h: float = 6.0,
        close_h: float = 24.0,
    ) -> float:
        """Sum of Gaussians clamped to operating hours, with tiny noise floor."""
        if hour < open_h or hour > close_h:
            return 0.0
        value = 0.04 + sum(self._gaussian(hour, c, a, w) for c, a, w in peaks)
        value += self._rng.gauss(0.0, 0.008)   # subtle real-world jitter
        return min(1.0, max(0.0, value))

    def _clamp_int(self, frac: float, sigma: float, lo: int, hi: int) -> int:
        return max(lo, min(hi, round(frac + self._rng.gauss(0.0, sigma))))

    @staticmethod
    def _noise_from_occ(occ: float, jitter: float = 0.015) -> float:
        """Noise level (0–1) rises linearly with crowd size."""
        return min(1.0, max(0.0, occ * 0.82 + jitter))

    @staticmethod
    def _noise_label(n: float) -> str:
        if n < 0.3:
            return "quiet"
        if n < 0.6:
            return "moderate"
        if n < 0.85:
            return "loud"
        return "very loud"

    def _roc(self, key: str, current: float) -> float:
        """Normalised absolute rate-of-change vs previous tick (0–1)."""
        diff = abs(current - self._prev.get(key, current)) * 20.0
        return min(1.0, max(0.0, diff))

    @staticmethod
    def _ssi(occ: float, noise: float, roc: float) -> float:
        return (0.7 * occ ** 2) + (0.2 * noise) + (0.1 * roc)

    @staticmethod
    def _status(ssi: float) -> str:
        if ssi < 0.40:
            return "low"
        if ssi < 0.70:
            return "moderate"
        if ssi < 0.85:
            return "high"
        return "critical"

    @staticmethod
    def _psi_status(psi: float) -> str:
        """Parking Stress Index thresholds (slightly different from SSI)."""
        if psi < 0.40: return "low"
        if psi < 0.70: return "moderate"
        if psi < 0.90: return "high"
        return "critical"

    def _avail_range(self, available: int, spread: int = 5) -> str:
        """Return an estimated availability range string e.g. '10–20'."""
        lo = max(0, available - spread)
        hi = available + spread
        return f"{lo}–{hi}"

    # ── Location builders ──────────────────────────────────────────────────────

    def _build_rec_center(self, hour: float) -> dict:
        occ = self._occupancy(hour, [
            (10.0, 0.30, 1.4),   # light morning use
            (13.5, 0.45, 1.2),   # midday moderate
            (18.5, 0.95, 1.8),   # main evening peak 5–8 PM
        ], open_h=8.0, close_h=22.0)

        roc   = self._roc("rec", occ)
        ssi   = self._ssi(occ, 0.0, roc)   # rec center has no noise metric
        noise = self._noise_from_occ(occ)

        resources: Dict[str, Any] = {
            "Badminton Courts": {
                "current":  self._clamp_int(occ * 3,  0.15, 0, 3),
                "capacity": 3,
            },
            "Basketball Court": {
                "current":  self._clamp_int(occ,      0.10, 0, 1),
                "capacity": 1,
            },
            "Soccer Field": {
                "current":  self._clamp_int(occ,      0.07, 0, 1),
                "capacity": 1,
            },
            "Pool Lanes": {
                "current":  self._clamp_int(occ * 6,  0.30, 0, 6),
                "capacity": 6,
            },
            "Treadmills": {
                "current":  self._clamp_int(occ * 20, 0.60, 0, 20),
                "capacity": 20,
            },
        }

        return {
            "name":             "Recreation Center",
            "occupancy_ratio":  round(occ,   4),
            "noise_level":      round(noise,  4),
            "noise_label":      self._noise_label(noise),
            "ssi":              round(ssi,   4),
            "status":           self._status(ssi),
            "resources":        resources,
        }

    def _build_library(self, hour: float) -> dict:
        occ = self._occupancy(hour, [
            (10.5, 0.40, 1.5),   # morning trickle
            (14.0, 0.60, 2.0),   # afternoon moderate
            (20.0, 0.90, 1.8),   # evening exam crunch (peaks later than union)
        ], open_h=8.0, close_h=22.0)

        noise = self._noise_from_occ(occ, jitter=0.012)
        roc   = self._roc("lib", occ)
        ssi   = self._ssi(occ, noise, roc)

        resources: Dict[str, Any] = {
            "Study Seats": {
                "current":  self._clamp_int(occ * 300, 3.0, 0, 300),
                "capacity": 300,
            },
            "Noise Level": {
                "current":  self._clamp_int(noise * 100, 1.0, 0, 100),
                "capacity": 100,
                "label":    self._noise_label(noise),
            },
        }

        return {
            "name":             "Carlson Library",
            "occupancy_ratio":  round(occ,   4),
            "noise_level":      round(noise,  4),
            "noise_label":      self._noise_label(noise),
            "ssi":              round(ssi,   4),
            "status":           self._status(ssi),
            "resources":        resources,
        }

    def _build_student_union(self, hour: float) -> dict:
        occ = self._occupancy(hour, [
            (12.5, 0.93, 0.9),   # lunch rush  11:30 AM–1:30 PM
            (18.5, 0.85, 1.0),   # dinner rush  5:30 PM–7:30 PM
        ], open_h=8.0, close_h=22.0)

        noise = self._noise_from_occ(occ, jitter=0.018)
        roc   = self._roc("union", occ)
        ssi   = self._ssi(occ, noise, roc)

        # Dining crowd descriptor
        if occ < 0.3:
            crowd_label = "empty"
        elif occ < 0.6:
            crowd_label = "moderate"
        elif occ < 0.85:
            crowd_label = "busy"
        else:
            crowd_label = "packed"

        resources: Dict[str, Any] = {
            "Study Seats": {
                "current":  self._clamp_int(occ * 80, 1.0, 0, 80),
                "capacity": 80,
            },
            "Dining Crowd": {
                "current":  self._clamp_int(occ * 100, 2.0, 0, 100),
                "capacity": 100,
                "label":    crowd_label,
            },
        }

        return {
            "name":             "Student Union",
            "occupancy_ratio":  round(occ,   4),
            "noise_level":      round(noise,  4),
            "noise_label":      self._noise_label(noise),
            "ssi":              round(ssi,   4),
            "status":           self._status(ssi),
            "resources":        resources,
        }

    def _build_north_engineering(self, hour: float) -> dict:
        """
        North Engineering (NE) — peaks 9 AM–3 PM, persistently elevated baseline.

        Resources
        ---------
          Computer Lab Seats  (120)
          3D Printers Active  (15)
          Project Rooms       (8)
        """
        occ_raw = self._occupancy(hour, [
            (10.0, 0.60, 1.4),   # morning lab rush  (9–11 AM)
            (13.0, 0.90, 1.5),   # heavy midday peak (11:30 AM–2:30 PM)
        ], open_h=7.5, close_h=22.0)

        # Floor at 0.65 → always ≥ MODERATE stress even after hours
        occ   = min(1.0, max(0.65, occ_raw))
        noise = self._noise_from_occ(occ, jitter=0.012)
        roc   = self._roc("ne_bldg", occ)
        ssi   = self._ssi(occ, noise, roc)

        resources: Dict[str, Any] = {
            "Computer Lab Seats": {
                "current":  self._clamp_int(occ * 120, 2.0, 0, 120),
                "capacity": 120,
            },
            "3D Printers Active": {
                "current":  self._clamp_int(occ * 15, 0.5, 0, 15),
                "capacity": 15,
            },
            "Project Rooms": {
                "current":  self._clamp_int(occ * 8, 0.3, 0, 8),
                "capacity": 8,
            },
        }

        return {
            "name":             "North Engineering",
            "occupancy_ratio":  round(occ,   4),
            "noise_level":      round(noise,  4),
            "noise_label":      self._noise_label(noise),
            "ssi":              round(ssi,   4),
            "status":           self._status(ssi),
            "resources":        resources,
        }

    def _build_parking(self, hour: float) -> Dict[str, Any]:
        """
        Simulate parking occupancy for five campus zones.

        Zones
        -----
        Academic Core      — Lots 13/13N/14/12  — HIGH morning/midday, low evening
        Library Zone       — Lots 2/3/26         — moderate daytime, HIGH evening
        Student Union Lot  — Lots 8/9/7N         — peaks at lunch and dinner
        Rec Center Lot     — Lots 5/18           — low morning, HIGH evening
        North Engineering  — Lots 4/20/East Ramp — very heavy morning/midday
        """
        def _lot(occ: float, cap: int, spread: int = 4) -> dict:
            occupied  = self._clamp_int(occ * cap, float(spread), 0, cap)
            available = cap - occupied
            psi       = round(occupied / cap, 4)
            return occupied, available, psi

        # ── Academic Core (220 spots) — Lots 13, 13N, 14, 12 ─────────────────
        ac_occ  = self._occupancy(hour, [
            (9.5,  0.85, 1.2),   # morning arrival rush
            (12.5, 0.95, 1.0),   # midday peak
        ], open_h=8.0, close_h=22.0)
        ac_cap = 220
        ac_occupied, ac_available, ac_psi = _lot(ac_occ, ac_cap, 4)

        # ── Library Zone (120 spots) — Lots 2, 3, 26 ─────────────────────────
        lib_occ = self._occupancy(hour, [
            (11.0, 0.50, 2.0),   # moderate midday
            (19.0, 0.88, 1.5),   # evening study crowd
        ], open_h=8.0, close_h=22.0)
        lib_cap = 120
        lib_occupied, lib_available, lib_psi = _lot(lib_occ, lib_cap, 3)

        # ── Student Union Lot (150 spots) — Lots 8, 9, 7N ────────────────────
        su_occ = self._occupancy(hour, [
            (12.5, 0.92, 0.8),   # lunch rush 11:30 AM–1:30 PM
            (18.5, 0.80, 0.9),   # dinner rush 5:30 PM–7:30 PM
        ], open_h=8.0, close_h=22.0)
        su_cap = 150
        su_occupied, su_available, su_psi = _lot(su_occ, su_cap, 3)

        # ── Rec Center Lot (180 spots) — Lots 5, 18 ──────────────────────────
        rec_occ = self._occupancy(hour, [
            (13.5, 0.35, 1.5),   # light midday use
            (18.5, 0.92, 1.8),   # evening workout peak
        ], open_h=8.0, close_h=22.0)
        rec_cap = 180
        rec_occupied, rec_available, rec_psi = _lot(rec_occ, rec_cap, 4)

        # ── North Engineering (260 spots) — Lots 4, 20, East Ramp ────────────
        ne_occ = self._occupancy(hour, [
            (9.5,  0.90, 1.1),   # morning arrival
            (12.0, 0.95, 0.8),   # midday peak (labs & classes)
            (14.5, 0.72, 1.2),   # afternoon moderate
        ], open_h=8.0, close_h=22.0)
        ne_cap = 260
        ne_occupied, ne_available, ne_psi = _lot(ne_occ, ne_cap, 5)

        def _entry(name: str, cap: int, occupied: int, available: int, psi: float) -> dict:
            return {
                "name":                name,
                "capacity":            cap,
                "occupied":            occupied,
                "available":           available,
                "estimated_available": self._avail_range(available),
                "psi":                 psi,
                "status":              self._psi_status(psi),
            }

        return {
            "academic_core":     _entry("Academic Core Lot",      ac_cap,  ac_occupied,  ac_available,  ac_psi),
            "library_lot":       _entry("Library Zone Lot",        lib_cap, lib_occupied, lib_available, lib_psi),
            "student_union_lot": _entry("Student Union Lot",       su_cap,  su_occupied,  su_available,  su_psi),
            "rec_center_lot":    _entry("Rec Center Lot",          rec_cap, rec_occupied, rec_available, rec_psi),
            "north_engineering": _entry("North Engineering Lot",   ne_cap,  ne_occupied,  ne_available,  ne_psi),
        }

    # ── Public API ─────────────────────────────────────────────────────────────

    def get_state(self) -> Dict[str, Any]:
        """
        Compute and return a full campus state snapshot.
        Call tick() first to advance the clock.
        """
        hour = self._hour

        rec     = self._build_rec_center(hour)
        lib     = self._build_library(hour)
        union   = self._build_student_union(hour)
        ne_bldg = self._build_north_engineering(hour)
        parking = self._build_parking(hour)

        # Update prev occupancies for next rate-of-change calculation
        self._prev = {
            "rec":     rec["occupancy_ratio"],
            "lib":     lib["occupancy_ratio"],
            "union":   union["occupancy_ratio"],
            "ne_bldg": ne_bldg["occupancy_ratio"],
        }

        # Global campus SSI: average across all four buildings
        global_ssi = (rec["ssi"] + lib["ssi"] + union["ssi"] + ne_bldg["ssi"]) / 4.0

        # Determine overall campus stress label
        if global_ssi < 0.40:
            global_status = "low"
        elif global_ssi < 0.70:
            global_status = "moderate"
        elif global_ssi < 0.85:
            global_status = "high"
        else:
            global_status = "critical"

        return {
            "type":          "update",
            "tick":          self._tick_count,
            "time":          self.sim_time_str,
            "sim_hour":      round(self._hour, 3),
            "time_warp":     self._time_warp_active,
            "global_ssi":    round(global_ssi, 4),
            "global_status": global_status,
            "locations": {
                "rec_center":             rec,
                "library":                lib,
                "student_union":          union,
                "north_engineering_bldg": ne_bldg,
            },
            "parking": parking,
        }
