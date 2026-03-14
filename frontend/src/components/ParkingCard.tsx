"use client";
import { Car, AlertTriangle, MapPin } from "lucide-react";
import type { ParkingState, ParkingLot, StressStatus } from "@/hooks/useCampusSocket";

const PARKING_NAMES: Record<string, string> = {
  academic_core:     "Academic Core Lot",
  library_lot:       "Library Zone Lot",
  student_union_lot: "Student Union Lot",
  rec_center_lot:    "Rec Center Lot",
  north_engineering: "North Engineering Lot",
};

const OP_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  full:           { label: "Lot Full",        color: "var(--critical)" },
  closed:         { label: "Closed",          color: "#94a3b8" },
  event_reserved: { label: "Event Reserved",  color: "var(--moderate)" },
  maintenance:    { label: "Maintenance",     color: "var(--high)" },
};

// ── Human-readable status ────────────────────────────────────────────────────
const THEME: Record<StressStatus, { color: string; bg: string; border: string; label: string }> = {
  low:      { color: "var(--low)",      bg: "var(--low-bg)",      border: "var(--low-border)",      label: "Open"    },
  moderate: { color: "var(--moderate)", bg: "var(--moderate-bg)", border: "var(--moderate-border)", label: "Filling"  },
  high:     { color: "var(--high)",     bg: "var(--high-bg)",     border: "var(--high-border)",     label: "Tight"    },
  critical: { color: "var(--critical)", bg: "var(--critical-bg)", border: "var(--critical-border)", label: "Full"     },
};

// ── Single lot row ────────────────────────────────────────────────────────────
function LotRow({ lot, lotKey }: { lot: ParkingLot; lotKey: string }) {
  const hasOverride = lot.override_active && lot.operational_status && lot.operational_status !== "open";
  const opLabel = hasOverride ? OP_STATUS_LABELS[lot.operational_status!] : null;
  const theme    = hasOverride ? { ...THEME[lot.status], color: opLabel!.color, label: opLabel!.label } : THEME[lot.status];
  const fillPct  = Math.round(lot.psi * 100);

  return (
    <div className="hover:bg-[#00264D]/60 transition-colors" style={{
      padding:      "14px 16px",
      borderRadius: 10,
      background:   "rgba(0,0,0,0.2)",
      border:       hasOverride ? `1px solid ${opLabel!.color}55` : `1px solid ${THEME[lot.status].border}`,
      marginBottom: 10,
    }}>
      {/* Lot name + status badge */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
          {lot.name}
        </span>
        <span style={{
          padding:       "4px 12px",
          borderRadius:  20,
          fontSize:      11,
          fontWeight:    800,
          letterSpacing: ".05em",
          color:         theme.color,
          background:    hasOverride ? `${opLabel!.color}18` : THEME[lot.status].bg,
          border:        `1px solid ${theme.color}44`,
        }}>
          {theme.label}
        </span>
      </div>

      {/* Capacity bar */}
      <div className="rounded-full" style={{
        height:       12,
        background:   "rgba(255,255,255,0.07)",
        overflow:     "hidden",
        marginBottom: 10,
      }}>
        <div style={{
          height:     "100%",
          width:      `${fillPct}%`,
          background: THEME[lot.status].color,
          borderRadius: 99,
          transition: "width .4s ease, background .4s ease",
          boxShadow:  `0 0 6px ${THEME[lot.status].color}70`,
        }} />
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>
          ~{lot.capacity > 0 ? Math.round((lot.occupied / lot.capacity) * 100) : 0}% full
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Est. spots left:</span>
          <span style={{
            fontFamily:  "var(--font-mono)",
            fontSize:    14,
            fontWeight:  700,
            color:       THEME[lot.status].color,
          }}>
            ~{lot.estimated_available}
          </span>
        </div>
      </div>

      {/* Admin advisory banner (shown when admin has set an override) */}
      {hasOverride && lot.advisory_message && (
        <div style={{
          marginTop:    10,
          padding:      "8px 12px",
          borderRadius: 8,
          background:   "rgba(231,76,60,0.08)",
          border:       "1px solid rgba(231,76,60,0.2)",
          display:      "flex",
          alignItems:   "center",
          gap:          8,
        }}>
          <AlertTriangle size={13} color="var(--critical)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "#FDECEA", lineHeight: 1.4 }}>
            {lot.advisory_message}
          </span>
        </div>
      )}

      {/* Recommended alternative */}
      {hasOverride && lot.recommended_alternative && (
        <div style={{
          marginTop:    8,
          padding:      "7px 12px",
          borderRadius: 8,
          background:   "rgba(255,199,44,0.06)",
          border:       "1px solid rgba(255,199,44,0.15)",
          display:      "flex",
          alignItems:   "center",
          gap:          6,
        }}>
          <MapPin size={12} color="var(--ut-gold)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
            Recommended: {" "}
            <strong style={{ color: "var(--ut-gold)", fontWeight: 700 }}>
              {PARKING_NAMES[lot.recommended_alternative] ?? lot.recommended_alternative}
            </strong>
          </span>
        </div>
      )}
    </div>
  );
}

// ── Parking Card ──────────────────────────────────────────────────────────────
interface Props {
  parking: ParkingState;
}

export default function ParkingCard({ parking }: Props) {
  const lots      = Object.values(parking);
  const worstPsi  = Math.max(...lots.map(l => l.psi));
  const overallStatus: StressStatus =
    worstPsi >= 0.90 ? "critical" :
    worstPsi >= 0.70 ? "high"     :
    worstPsi >= 0.40 ? "moderate" : "low";
  const theme = THEME[overallStatus];

  return (
    <div
      className="fade-up"
      style={{
        background:   "var(--bg-card)",
        borderRadius: 16,
        border:       `1px solid ${theme.border}`,
        boxShadow:    "0 4px 24px rgba(0,0,0,0.45)",
        overflow:     "hidden",
        transition:   "border-color .4s ease",
      }}
    >
      {/* Top accent strip */}
      <div style={{
        height:     3,
        background: `linear-gradient(90deg, ${theme.color}, ${theme.color}40)`,
      }} />

      <div style={{ padding: "20px 22px 22px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: "rgba(255,199,44,0.12)",
              border: "1px solid rgba(255,199,44,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Car size={20} color="var(--ut-gold)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>
                Campus Parking
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>
                Estimated lot availability across campus
              </div>
            </div>
          </div>

          {/* Total available chip */}
          <div style={{
            textAlign:  "center",
            padding:    "6px 16px",
            borderRadius: 10,
            background: "rgba(0,0,0,0.25)",
            border:     "1px solid var(--border)",
          }}>
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize:   20,
              fontWeight: 800,
              color:      theme.color,
            }}>
              ~{lots.reduce((s, l) => s + l.available, 0)}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: ".06em", textTransform: "uppercase" }}>
              spots free
            </div>
          </div>
        </div>

        {/* Lot rows */}
        {Object.entries(parking).map(([key, lot]) => (
          <LotRow key={key} lot={lot} lotKey={key} />
        ))}
      </div>
    </div>
  );
}
