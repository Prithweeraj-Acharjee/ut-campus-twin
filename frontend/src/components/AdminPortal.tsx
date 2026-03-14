"use client";
/**
 * AdminPortal.tsx — Campus Operations Command Center
 * ===================================================
 * Dense operational view for campus facilities managers.
 * All actions POST to /admin/* endpoints and immediately
 * reflect through the existing WebSocket pipeline.
 */

import { useState, useCallback } from "react";
import {
  Shield, AlertTriangle, Car, Building2, Radio, Snowflake,
  Trophy, PartyPopper, X, Send, Clock, Gauge, Wifi, WifiOff,
  ChevronLeft, Activity, Zap,
} from "lucide-react";
import {
  useCampusSocket,
  type CampusState,
  type Connection,
  type StressStatus,
  type ParkingLot,
  type LocationState,
  type ParkingOpStatus,
  type BuildingOpStatus,
} from "@/hooks/useCampusSocket";

// ── Constants ────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const STATUS_COLOR: Record<StressStatus, string> = {
  low:      "var(--low)",
  moderate: "var(--moderate)",
  high:     "var(--high)",
  critical: "var(--critical)",
};

const CONN_COLOR: Record<Connection, string> = {
  connected:  "var(--low)",
  connecting: "var(--moderate)",
  error:      "var(--critical)",
  closed:     "var(--critical)",
};

const BUILDING_META: Record<string, { name: string; code: string }> = {
  rec_center:             { name: "Recreation Center", code: "SRC" },
  library:                { name: "Carlson Library",   code: "CL" },
  student_union:          { name: "Student Union",     code: "SU" },
  north_engineering_bldg: { name: "North Engineering", code: "NE" },
};

const PARKING_NAMES: Record<string, string> = {
  academic_core:     "Academic Core Lot",
  library_lot:       "Library Zone Lot",
  student_union_lot: "Student Union Lot",
  rec_center_lot:    "Rec Center Lot",
  north_engineering: "North Engineering Lot",
};

const PARKING_OP_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  open:           { label: "Open",           color: "var(--low)",      bg: "var(--low-bg)" },
  full:           { label: "Full",           color: "var(--critical)", bg: "var(--critical-bg)" },
  closed:         { label: "Closed",         color: "#94a3b8",        bg: "rgba(148,163,184,0.12)" },
  event_reserved: { label: "Event Reserved", color: "var(--moderate)", bg: "var(--moderate-bg)" },
  maintenance:    { label: "Maintenance",    color: "var(--high)",     bg: "var(--high-bg)" },
};

const BUILDING_OP_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  online:      { label: "Online",      color: "var(--low)",      bg: "var(--low-bg)" },
  maintenance: { label: "Maintenance", color: "var(--high)",     bg: "var(--high-bg)" },
  emergency:   { label: "Emergency",   color: "var(--critical)", bg: "var(--critical-bg)" },
  closed:      { label: "Closed",      color: "#94a3b8",        bg: "rgba(148,163,184,0.12)" },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function trendArrow(ssi: number, prevSsi: number | undefined): { symbol: string; color: string; label: string } {
  if (prevSsi === undefined) return { symbol: "—", color: "var(--text-dim)", label: "stable" };
  const diff = ssi - prevSsi;
  if (diff > 0.02)  return { symbol: "▲", color: "var(--critical)", label: "rising" };
  if (diff < -0.02) return { symbol: "▼", color: "var(--low)",      label: "falling" };
  return { symbol: "●", color: "var(--moderate)", label: "stable" };
}

async function adminPost(path: string, body: object) {
  await fetch(`${API_URL}${path}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
}

// ── Sub-components ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SectionHeader({ icon: Icon, title, subtitle }: {
  icon: any;
  title: string;
  subtitle: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: "rgba(255,199,44,0.10)", border: "1px solid rgba(255,199,44,0.22)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={18} color="var(--ut-gold)" />
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", letterSpacing: ".02em" }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{subtitle}</div>
      </div>
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)", marginLeft: 12 }} />
    </div>
  );
}

/** Pill badge */
function OpBadge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 800,
      letterSpacing: ".06em", color, background: bg,
      border: `1px solid ${color}33`, textTransform: "uppercase",
    }}>
      {label}
    </span>
  );
}

// ── Parking Control Modal ────────────────────────────────────────────────────

function ParkingModal({ lotKey, lot, onClose }: {
  lotKey: string; lot: ParkingLot; onClose: () => void;
}) {
  const [status, setStatus]    = useState<ParkingOpStatus>(lot.operational_status ?? "open");
  const [altLot, setAltLot]    = useState(lot.recommended_alternative ?? "");
  const [advisory, setAdvisory] = useState(lot.advisory_message ?? "");
  const [saving, setSaving]    = useState(false);

  const save = useCallback(async () => {
    setSaving(true);
    await adminPost("/admin/parking", {
      lot_key: lotKey,
      operational_status: status,
      recommended_alternative: altLot,
      advisory_message: advisory,
    });
    setSaving(false);
    onClose();
  }, [lotKey, status, altLot, advisory, onClose]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,10,20,0.85)", display: "flex",
      alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--bg-card)", borderRadius: 16,
        border: "1px solid var(--border-gold)", padding: "28px 32px",
        width: 480, maxWidth: "90vw", boxShadow: "0 8px 48px rgba(0,0,0,0.6)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: "var(--text)" }}>
            Update: {PARKING_NAMES[lotKey] ?? lotKey}
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)",
          }}><X size={18} /></button>
        </div>

        {/* Status selector */}
        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", letterSpacing: ".08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
          Operational Status
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {(["open", "full", "closed", "event_reserved", "maintenance"] as ParkingOpStatus[]).map((s) => {
            const theme = PARKING_OP_LABELS[s];
            const active = status === s;
            return (
              <button key={s} onClick={() => setStatus(s)} style={{
                padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                cursor: "pointer", transition: "all .2s",
                background: active ? theme.bg : "rgba(0,0,0,0.3)",
                border: active ? `2px solid ${theme.color}` : "2px solid transparent",
                color: active ? theme.color : "var(--text-dim)",
              }}>
                {theme.label}
              </button>
            );
          })}
        </div>

        {/* Recommended alternative */}
        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", letterSpacing: ".08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
          Recommended Alternative Lot
        </label>
        <select
          value={altLot}
          onChange={(e) => setAltLot(e.target.value)}
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 8,
            background: "var(--bg-input)", border: "1px solid var(--border-hi)",
            color: "var(--text)", fontSize: 13, marginBottom: 18, cursor: "pointer",
          }}
        >
          <option value="">— None —</option>
          {Object.entries(PARKING_NAMES).filter(([k]) => k !== lotKey).map(([k, name]) => (
            <option key={k} value={k}>{name}</option>
          ))}
        </select>

        {/* Advisory message */}
        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", letterSpacing: ".08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
          Advisory Message
        </label>
        <textarea
          value={advisory}
          onChange={(e) => setAdvisory(e.target.value)}
          placeholder="e.g. Lot is full due to football game. Please use North Engineering Lot."
          rows={3}
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 8,
            background: "var(--bg-input)", border: "1px solid var(--border-hi)",
            color: "var(--text)", fontSize: 13, resize: "vertical", marginBottom: 20,
            fontFamily: "inherit",
          }}
        />

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "10px 20px", borderRadius: 8, background: "rgba(255,255,255,0.06)",
            border: "1px solid var(--border-hi)", color: "var(--text-dim)", fontSize: 12,
            fontWeight: 700, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{
            padding: "10px 24px", borderRadius: 8, background: "var(--ut-gold)",
            border: "none", color: "#001830", fontSize: 12, fontWeight: 800,
            cursor: "pointer", letterSpacing: ".04em",
          }}>
            {saving ? "Saving…" : "Apply Override"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Building Override Modal ──────────────────────────────────────────────────

function BuildingModal({ buildingKey, loc, onClose }: {
  buildingKey: string; loc: LocationState; onClose: () => void;
}) {
  const [status, setStatus] = useState<BuildingOpStatus>(loc.operational_status ?? "online");
  const [saving, setSaving] = useState(false);

  const save = useCallback(async () => {
    setSaving(true);
    await adminPost("/admin/override", {
      building_key: buildingKey,
      operational_status: status,
    });
    setSaving(false);
    onClose();
  }, [buildingKey, status, onClose]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,10,20,0.85)", display: "flex",
      alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--bg-card)", borderRadius: 16,
        border: "1px solid var(--border-gold)", padding: "28px 32px",
        width: 420, maxWidth: "90vw", boxShadow: "0 8px 48px rgba(0,0,0,0.6)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: "var(--text)" }}>
            Override: {loc.name}
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)",
          }}><X size={18} /></button>
        </div>

        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", letterSpacing: ".08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
          Operational Status
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          {(["online", "maintenance", "emergency", "closed"] as BuildingOpStatus[]).map((s) => {
            const theme = BUILDING_OP_LABELS[s];
            const active = status === s;
            return (
              <button key={s} onClick={() => setStatus(s)} style={{
                padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                cursor: "pointer", transition: "all .2s",
                background: active ? theme.bg : "rgba(0,0,0,0.3)",
                border: active ? `2px solid ${theme.color}` : "2px solid transparent",
                color: active ? theme.color : "var(--text-dim)",
              }}>
                {theme.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "10px 20px", borderRadius: 8, background: "rgba(255,255,255,0.06)",
            border: "1px solid var(--border-hi)", color: "var(--text-dim)", fontSize: 12,
            fontWeight: 700, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{
            padding: "10px 24px", borderRadius: 8, background: "var(--ut-gold)",
            border: "none", color: "#001830", fontSize: 12, fontWeight: 800,
            cursor: "pointer", letterSpacing: ".04em",
          }}>
            {saving ? "Saving…" : "Apply Override"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ADMIN PORTAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdminPortal() {
  const { state, connection } = useCampusSocket();

  // Modal state
  const [parkingModal, setParkingModal] = useState<{ key: string; lot: ParkingLot } | null>(null);
  const [buildingModal, setBuildingModal] = useState<{ key: string; loc: LocationState } | null>(null);

  // Alert input
  const [alertText, setAlertText]   = useState("");
  const [alertSending, setAlertSending] = useState(false);

  // Track previous SSI for trend indicators
  const [prevSsi, setPrevSsi] = useState<Record<string, number>>({});

  // Update prev SSI on each tick (simple approach — stores last seen)
  if (state?.locations) {
    const current: Record<string, number> = {};
    Object.entries(state.locations).forEach(([k, loc]) => { current[k] = loc.ssi; });
    // Only update if tick changed
    if (state.tick && !prevSsi._tick || (prevSsi._tick as unknown as number) !== state.tick) {
      const next = { ...current, _tick: state.tick as unknown as number };
      // Use setTimeout to avoid setState during render
      setTimeout(() => setPrevSsi(next), 0);
    }
  }

  const sendAlert = useCallback(async () => {
    setAlertSending(true);
    await adminPost("/admin/alert", { message: alertText });
    setAlertSending(false);
  }, [alertText]);

  const clearAlert = useCallback(async () => {
    await adminPost("/admin/alert", { message: "" });
    setAlertText("");
  }, []);

  const triggerIncident = useCallback(async (incident: string | null) => {
    await adminPost("/admin/incident", { incident });
  }, []);

  const locations = state?.locations;
  const parking   = state?.parking;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>

      {/* ═══ HEADER ═══ */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "linear-gradient(135deg, #0a1628 0%, var(--ut-blue-dark) 100%)",
        borderBottom: "2px solid var(--ut-gold)",
        padding: "0 28px", height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 4px 32px rgba(0,0,0,0.5)",
      }}>
        {/* Left */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8, color: "var(--text-dim)", fontSize: 12, fontWeight: 600 }}>
            <ChevronLeft size={14} /> Student View
          </a>
          <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.1)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "rgba(255,199,44,0.12)", border: "1px solid rgba(255,199,44,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Shield size={16} color="var(--ut-gold)" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", letterSpacing: ".02em" }}>
                Admin Command Center
              </div>
              <div style={{ fontSize: 9, color: "rgba(255,199,44,0.7)", letterSpacing: ".12em", textTransform: "uppercase" }}>
                Campus Operations Portal
              </div>
            </div>
          </div>
        </div>

        {/* Center: Clock + Status */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={14} color="rgba(255,199,44,0.6)" />
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 800,
              color: state?.time_warp ? "var(--ut-gold)" : "#fff",
              letterSpacing: ".05em",
            }}>
              {state?.time ?? "——:——"}
            </span>
          </div>
          {state && (
            <>
              <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.1)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Gauge size={14} color={STATUS_COLOR[state.global_status]} />
                <span style={{
                  fontSize: 13, fontWeight: 800, color: STATUS_COLOR[state.global_status],
                  textTransform: "uppercase", letterSpacing: ".06em",
                }}>
                  {state.global_status}
                </span>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
                  color: STATUS_COLOR[state.global_status], padding: "2px 8px",
                  borderRadius: 12, background: `${STATUS_COLOR[state.global_status]}18`,
                }}>
                  {state.global_ssi.toFixed(3)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {state?.active_incident && (
            <div style={{
              padding: "5px 12px", borderRadius: 20, fontSize: 10, fontWeight: 800,
              letterSpacing: ".06em", textTransform: "uppercase",
              color: "var(--critical)", background: "var(--critical-bg)",
              border: "1px solid var(--critical-border)",
              animation: "goldPulse 2s ease-in-out infinite",
            }}>
              Incident Active: {state.active_incident.replace(/_/g, " ")}
            </div>
          )}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 12px", borderRadius: 20,
            background: "rgba(0,0,0,0.3)", border: `1px solid ${CONN_COLOR[connection]}30`,
          }}>
            {connection === "connected"
              ? <Wifi size={12} color={CONN_COLOR[connection]} />
              : <WifiOff size={12} color={CONN_COLOR[connection]} />}
            <span style={{ fontSize: 10, fontWeight: 700, color: CONN_COLOR[connection], letterSpacing: ".06em", textTransform: "uppercase" }}>
              {connection}
            </span>
          </div>
        </div>
      </header>

      {/* ═══ GLOBAL ALERT BANNER (if active) ═══ */}
      {state?.global_alert && (
        <div style={{
          padding: "10px 28px", background: "linear-gradient(90deg, rgba(231,76,60,0.15), rgba(231,76,60,0.08))",
          borderBottom: "1px solid rgba(231,76,60,0.3)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <AlertTriangle size={16} color="var(--critical)" />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#FDECEA", flex: 1 }}>
            {state.global_alert}
          </span>
          <button onClick={clearAlert} style={{
            padding: "4px 12px", borderRadius: 6, fontSize: 10, fontWeight: 700,
            background: "rgba(231,76,60,0.2)", border: "1px solid rgba(231,76,60,0.4)",
            color: "var(--critical)", cursor: "pointer",
          }}>Dismiss</button>
        </div>
      )}

      {/* ═══ MAIN CONTENT ═══ */}
      <main style={{ flex: 1, padding: "24px 28px 48px" }}>

        {!state ? (
          <div style={{ textAlign: "center", paddingTop: 100, color: "var(--text-dim)" }}>
            <Activity size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-mid)" }}>
              Connecting to campus backend…
            </div>
          </div>
        ) : (
          <>
            {/* ── ROW 1: Incident Controls + Global Alert ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

              {/* Incident Control Panel */}
              <div style={{
                background: "var(--bg-card)", borderRadius: 14,
                border: "1px solid var(--border)", padding: "20px 22px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
              }}>
                <SectionHeader icon={Zap} title="Incident Control" subtitle="Simulate campus-wide events" />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                  {/* Football */}
                  <button
                    onClick={() => triggerIncident(state.active_incident === "football_game" ? null : "football_game")}
                    style={{
                      padding: "14px 10px", borderRadius: 10, cursor: "pointer",
                      background: state.active_incident === "football_game" ? "rgba(231,76,60,0.15)" : "rgba(0,0,0,0.25)",
                      border: state.active_incident === "football_game" ? "2px solid var(--critical)" : "2px solid var(--border-hi)",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                      transition: "all .2s",
                    }}
                  >
                    <Trophy size={22} color={state.active_incident === "football_game" ? "var(--critical)" : "var(--text-dim)"} />
                    <span style={{
                      fontSize: 11, fontWeight: 800, letterSpacing: ".04em",
                      color: state.active_incident === "football_game" ? "var(--critical)" : "var(--text-dim)",
                    }}>Football Game</span>
                  </button>

                  {/* Homecoming */}
                  <button
                    onClick={() => triggerIncident(state.active_incident === "homecoming" ? null : "homecoming")}
                    style={{
                      padding: "14px 10px", borderRadius: 10, cursor: "pointer",
                      background: state.active_incident === "homecoming" ? "rgba(255,199,44,0.12)" : "rgba(0,0,0,0.25)",
                      border: state.active_incident === "homecoming" ? "2px solid var(--ut-gold)" : "2px solid var(--border-hi)",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                      transition: "all .2s",
                    }}
                  >
                    <PartyPopper size={22} color={state.active_incident === "homecoming" ? "var(--ut-gold)" : "var(--text-dim)"} />
                    <span style={{
                      fontSize: 11, fontWeight: 800, letterSpacing: ".04em",
                      color: state.active_incident === "homecoming" ? "var(--ut-gold)" : "var(--text-dim)",
                    }}>Homecoming</span>
                  </button>

                  {/* Snow Alert */}
                  <button
                    onClick={() => triggerIncident(state.active_incident === "snow_alert" ? null : "snow_alert")}
                    style={{
                      padding: "14px 10px", borderRadius: 10, cursor: "pointer",
                      background: state.active_incident === "snow_alert" ? "rgba(148,163,184,0.15)" : "rgba(0,0,0,0.25)",
                      border: state.active_incident === "snow_alert" ? "2px solid #94a3b8" : "2px solid var(--border-hi)",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                      transition: "all .2s",
                    }}
                  >
                    <Snowflake size={22} color={state.active_incident === "snow_alert" ? "#94a3b8" : "var(--text-dim)"} />
                    <span style={{
                      fontSize: 11, fontWeight: 800, letterSpacing: ".04em",
                      color: state.active_incident === "snow_alert" ? "#94a3b8" : "var(--text-dim)",
                    }}>Snow Alert</span>
                  </button>
                </div>

                {state.active_incident && (
                  <button onClick={() => triggerIncident(null)} style={{
                    width: "100%", padding: "8px", borderRadius: 8,
                    background: "rgba(231,76,60,0.08)", border: "1px solid rgba(231,76,60,0.3)",
                    color: "var(--critical)", fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}>
                    Clear All Incident Overrides
                  </button>
                )}
              </div>

              {/* Global Alert Panel */}
              <div style={{
                background: "var(--bg-card)", borderRadius: 14,
                border: "1px solid var(--border)", padding: "20px 22px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
              }}>
                <SectionHeader icon={Radio} title="Global Alert" subtitle="Broadcast campus-wide messages" />

                <textarea
                  value={alertText}
                  onChange={(e) => setAlertText(e.target.value)}
                  placeholder="Type a campus-wide alert message…"
                  rows={3}
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: 8,
                    background: "var(--bg-input)", border: "1px solid var(--border-hi)",
                    color: "var(--text)", fontSize: 13, resize: "vertical", marginBottom: 12,
                    fontFamily: "inherit",
                  }}
                />

                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={sendAlert} disabled={!alertText.trim() || alertSending} style={{
                    flex: 1, padding: "10px", borderRadius: 8, display: "flex",
                    alignItems: "center", justifyContent: "center", gap: 8,
                    background: alertText.trim() ? "var(--ut-gold)" : "rgba(255,255,255,0.06)",
                    border: "none", color: alertText.trim() ? "#001830" : "var(--text-dim)",
                    fontSize: 12, fontWeight: 800, cursor: alertText.trim() ? "pointer" : "default",
                    transition: "all .2s",
                  }}>
                    <Send size={13} />
                    {alertSending ? "Sending…" : "Broadcast Alert"}
                  </button>
                  {state.global_alert && (
                    <button onClick={clearAlert} style={{
                      padding: "10px 20px", borderRadius: 8,
                      background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.3)",
                      color: "var(--critical)", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}>
                      Clear Alert
                    </button>
                  )}
                </div>

                {state.global_alert && (
                  <div style={{
                    marginTop: 14, padding: "10px 14px", borderRadius: 8,
                    background: "rgba(231,76,60,0.08)", border: "1px solid rgba(231,76,60,0.2)",
                    fontSize: 12, color: "#FDECEA", display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <AlertTriangle size={14} color="var(--critical)" />
                    <span style={{ fontWeight: 600 }}>Active:</span> {state.global_alert}
                  </div>
                )}
              </div>
            </div>

            {/* ── ROW 2: Buildings Table ── */}
            {locations && (
              <div style={{
                background: "var(--bg-card)", borderRadius: 14,
                border: "1px solid var(--border)", padding: "20px 22px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.35)", marginBottom: 24,
              }}>
                <SectionHeader icon={Building2} title="Facilities Monitor" subtitle="Real-time building status" />

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-hi)" }}>
                        {["Building", "Code", "SSI", "Trend", "Occupancy", "Op Status", "Action"].map((h) => (
                          <th key={h} style={{
                            padding: "10px 14px", textAlign: "left", fontSize: 10,
                            fontWeight: 800, color: "var(--text-dim)", letterSpacing: ".1em",
                            textTransform: "uppercase", whiteSpace: "nowrap",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(locations).map(([key, loc]) => {
                        const meta = BUILDING_META[key] ?? { name: key, code: "??" };
                        const trend = trendArrow(loc.ssi, prevSsi[key]);
                        const opStatus = loc.operational_status ?? "online";
                        const opTheme = BUILDING_OP_LABELS[opStatus] ?? BUILDING_OP_LABELS.online;
                        return (
                          <tr key={key} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "12px 14px", fontWeight: 700, color: "var(--text)" }}>{meta.name}</td>
                            <td style={{ padding: "12px 14px" }}>
                              <span style={{
                                fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
                                padding: "3px 8px", borderRadius: 6,
                                background: "rgba(255,199,44,0.08)", color: "var(--ut-gold)",
                              }}>{meta.code}</span>
                            </td>
                            <td style={{ padding: "12px 14px" }}>
                              <span style={{
                                fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 15,
                                color: STATUS_COLOR[loc.status],
                              }}>
                                {(loc.ssi * 100).toFixed(0)}
                              </span>
                              <span style={{ fontSize: 10, color: "var(--text-dim)", marginLeft: 2 }}>/100</span>
                            </td>
                            <td style={{ padding: "12px 14px" }}>
                              <span style={{ color: trend.color, fontWeight: 800, fontSize: 14, marginRight: 6 }}>
                                {trend.symbol}
                              </span>
                              <span style={{ fontSize: 10, color: "var(--text-dim)" }}>{trend.label}</span>
                            </td>
                            <td style={{ padding: "12px 14px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{
                                  flex: 1, maxWidth: 80, height: 6, borderRadius: 99,
                                  background: "rgba(255,255,255,0.07)", overflow: "hidden",
                                }}>
                                  <div style={{
                                    height: "100%", width: `${Math.round(loc.occupancy_ratio * 100)}%`,
                                    background: STATUS_COLOR[loc.status], borderRadius: 99,
                                    transition: "width .4s",
                                  }} />
                                </div>
                                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text)", fontSize: 12 }}>
                                  {Math.round(loc.occupancy_ratio * 100)}%
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: "12px 14px" }}>
                              <OpBadge {...opTheme} />
                            </td>
                            <td style={{ padding: "12px 14px" }}>
                              <button
                                onClick={() => setBuildingModal({ key, loc })}
                                style={{
                                  padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                                  background: "rgba(255,199,44,0.08)", border: "1px solid rgba(255,199,44,0.25)",
                                  color: "var(--ut-gold)", cursor: "pointer", whiteSpace: "nowrap",
                                }}
                              >
                                Override
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── ROW 3: Parking Table ── */}
            {parking && (
              <div style={{
                background: "var(--bg-card)", borderRadius: 14,
                border: "1px solid var(--border)", padding: "20px 22px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
              }}>
                <SectionHeader icon={Car} title="Parking Control" subtitle="Manage lot availability and advisories" />

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-hi)" }}>
                        {["Parking Zone", "Occupancy", "Sim Status", "Op Status", "Advisory", "Alt Lot", "Action"].map((h) => (
                          <th key={h} style={{
                            padding: "10px 14px", textAlign: "left", fontSize: 10,
                            fontWeight: 800, color: "var(--text-dim)", letterSpacing: ".1em",
                            textTransform: "uppercase", whiteSpace: "nowrap",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(parking).map(([key, lot]: [string, ParkingLot]) => {
                        const opStatus = lot.operational_status ?? "open";
                        const opTheme = PARKING_OP_LABELS[opStatus] ?? PARKING_OP_LABELS.open;
                        const fillPct = Math.round(lot.psi * 100);
                        return (
                          <tr key={key} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "12px 14px", fontWeight: 700, color: "var(--text)" }}>
                              {lot.name}
                            </td>
                            <td style={{ padding: "12px 14px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{
                                  flex: 1, maxWidth: 80, height: 6, borderRadius: 99,
                                  background: "rgba(255,255,255,0.07)", overflow: "hidden",
                                }}>
                                  <div style={{
                                    height: "100%", width: `${fillPct}%`,
                                    background: STATUS_COLOR[lot.status], borderRadius: 99,
                                    transition: "width .4s",
                                  }} />
                                </div>
                                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text)", fontSize: 12 }}>
                                  {fillPct}%
                                </span>
                                <span style={{ fontSize: 10, color: "var(--text-dim)" }}>
                                  (~{lot.estimated_available} free)
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: "12px 14px" }}>
                              <OpBadge
                                label={lot.status.toUpperCase()}
                                color={STATUS_COLOR[lot.status]}
                                bg={`${STATUS_COLOR[lot.status]}18`}
                              />
                            </td>
                            <td style={{ padding: "12px 14px" }}>
                              <OpBadge {...opTheme} />
                            </td>
                            <td style={{ padding: "12px 14px", maxWidth: 180 }}>
                              <span style={{ fontSize: 11, color: lot.advisory_message ? "var(--text)" : "var(--text-dim)" }}>
                                {lot.advisory_message || "—"}
                              </span>
                            </td>
                            <td style={{ padding: "12px 14px" }}>
                              <span style={{ fontSize: 11, color: lot.recommended_alternative ? "var(--ut-gold)" : "var(--text-dim)", fontWeight: 600 }}>
                                {lot.recommended_alternative ? (PARKING_NAMES[lot.recommended_alternative] ?? lot.recommended_alternative) : "—"}
                              </span>
                            </td>
                            <td style={{ padding: "12px 14px" }}>
                              <button
                                onClick={() => setParkingModal({ key, lot })}
                                style={{
                                  padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                                  background: "rgba(255,199,44,0.08)", border: "1px solid rgba(255,199,44,0.25)",
                                  color: "var(--ut-gold)", cursor: "pointer", whiteSpace: "nowrap",
                                }}
                              >
                                Update Advisory
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer style={{
        height: 34, background: "var(--ut-blue-dark)",
        borderTop: "1px solid rgba(255,199,44,0.15)",
        display: "flex", alignItems: "center", padding: "0 28px", gap: 16,
        fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-mono)",
      }}>
        <span style={{ color: "rgba(255,199,44,0.6)", fontWeight: 700 }}>UToledo</span>
        <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
        <span>Admin Command Center v1.0</span>
        {state && (
          <>
            <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
            <span>tick #{state.tick}</span>
          </>
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: CONN_COLOR[connection],
            display: "inline-block", boxShadow: `0 0 6px ${CONN_COLOR[connection]}`,
          }} />
          <span>{connection.toUpperCase()}</span>
        </div>
      </footer>

      {/* ═══ MODALS ═══ */}
      {parkingModal && (
        <ParkingModal
          lotKey={parkingModal.key}
          lot={parkingModal.lot}
          onClose={() => setParkingModal(null)}
        />
      )}
      {buildingModal && (
        <BuildingModal
          buildingKey={buildingModal.key}
          loc={buildingModal.loc}
          onClose={() => setBuildingModal(null)}
        />
      )}
    </div>
  );
}
