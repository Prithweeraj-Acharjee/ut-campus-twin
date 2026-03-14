"use client";
import { Dumbbell, BookOpen, Coffee, Cpu, AlertTriangle } from "lucide-react";
import type { LocationState, StressStatus } from "@/hooks/useCampusSocket";

// ── Human-readable status ────────────────────────────────────────────────────
const THEME: Record<StressStatus, {
  color: string; bg: string; border: string; label: string; sentence: string;
}> = {
  low:      { color: "var(--low)",      bg: "var(--low-bg)",      border: "var(--low-border)",      label: "Quiet",   sentence: "Plenty of space available."             },
  moderate: { color: "var(--moderate)", bg: "var(--moderate-bg)", border: "var(--moderate-border)", label: "Busy",    sentence: "Getting busier — seating filling up."   },
  high:     { color: "var(--high)",     bg: "var(--high-bg)",     border: "var(--high-border)",     label: "Crowded", sentence: "Limited availability. Plan ahead."      },
  critical: { color: "var(--critical)", bg: "var(--critical-bg)", border: "var(--critical-border)", label: "Full",    sentence: "At capacity — try somewhere else."      },
};

// ── Location metadata ─────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const META: Record<string, {
  Icon:     any;
  subtitle: string;
  code:     string;
}> = {
  rec_center:             { Icon: Dumbbell, subtitle: "Fitness & Athletics",   code: "SRC" },
  library:                { Icon: BookOpen, subtitle: "Study & Research",       code: "CL"  },
  student_union:          { Icon: Coffee,   subtitle: "Dining & Social Hub",    code: "SU"  },
  north_engineering_bldg: { Icon: Cpu,      subtitle: "Engineering & Research", code: "NE"  },
};

// ── Friendly resource names ───────────────────────────────────────────────────
const RESOURCE_NAMES: Record<string, string> = {
  badminton_courts: "Badminton Courts",
  basketball_court: "Basketball Court",
  soccer_field:     "Soccer Field",
  pool_lanes:       "Pool Lanes",
  treadmills:       "Treadmills",
  study_seats:      "Study Seats",
  noise_level:      "Noise Level",
  dining_crowd:     "Dining Crowd",
  computer_lab_seats: "Computer Lab",
  "3d_printers_active": "3D Printers",
  project_rooms:    "Project Rooms",
};

// ── Segmented SSI Gauge ───────────────────────────────────────────────────────
function SegmentedGauge({ ssi, status }: { ssi: number; status: StressStatus }) {
  const SEGMENTS = 5;
  const filled   = Math.max(0, Math.min(SEGMENTS, Math.ceil(ssi * SEGMENTS)));
  const { color } = THEME[status];

  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between",
        marginBottom: 6, alignItems: "center",
      }}>
        <div>
          <span style={{
            fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.45)", fontWeight: 700, fontFamily: "var(--font-mono)",
          }}>
            How Busy Is It?
          </span>
        </div>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, color,
        }}>
          {(ssi * 100).toFixed(0)}
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 1 }}>/ 100</span>
        </span>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
        {Array.from({ length: SEGMENTS }, (_, i) => {
          const active = i < filled;
          return (
            <div key={i} style={{
              flex:         1,
              height:       12,
              borderRadius: 4,
              background:   active ? color : "rgba(255,255,255,0.05)",
              boxShadow:    active ? `0 0 8px ${color}70` : "none",
              transition:   "background .35s ease, box-shadow .35s ease",
              border:       active ? "none" : "1px solid rgba(255,255,255,0.06)",
            }} />
          );
        })}
      </div>

      {/* Color legend */}
      <div style={{
        display: "flex", justifyContent: "center", gap: 14, marginTop: 2,
        fontSize: 9, color: "rgba(255,255,255,0.35)",
        fontFamily: "var(--font-mono)",
      }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--low)", display: "inline-block" }} />
          Quiet
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--moderate)", display: "inline-block" }} />
          Busy
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--high)", display: "inline-block" }} />
          Crowded
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--critical)", display: "inline-block" }} />
          Full
        </span>
      </div>
    </div>
  );
}

// ── Resource Row ──────────────────────────────────────────────────────────────
function ResourceRow({ label, current, capacity, resourceLabel }: {
  label: string; current: number; capacity: number; resourceLabel?: string;
}) {
  const ratio    = capacity > 0 ? current / capacity : 0;
  const barColor = ratio > 0.85 ? "var(--critical)"
                 : ratio > 0.70 ? "var(--high)"
                 : ratio > 0.45 ? "var(--moderate)"
                 : "var(--low)";

  const friendlyName = RESOURCE_NAMES[label] ?? label.replace(/_/g, " ");

  return (
    <div style={{
      marginBottom:  8,
      padding:       "8px 12px",
      borderRadius:  8,
      background:    "rgba(0,0,0,0.18)",
      border:        "1px solid rgba(255,255,255,0.05)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: resourceLabel ? 0 : 6 }}>
        <span style={{
          fontSize: 13, color: "rgba(255,255,255,0.6)",
          fontWeight: 600,
        }}>
          {friendlyName}
        </span>

        {resourceLabel ? (
          <span style={{
            fontFamily:    "var(--font-mono)",
            fontSize:      12,
            color:         barColor,
            fontWeight:    700,
            letterSpacing: ".05em",
            fontStyle:     "italic",
          }}>
            {resourceLabel}
          </span>
        ) : (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: "#FFC72C", letterSpacing: ".03em" }}>
            ~{capacity > 0 ? Math.round((current / capacity) * 100) : 0}% Full
          </span>
        )}
      </div>

      {!resourceLabel && (
        <div style={{
          height:       10,
          borderRadius: 99,
          background:   "rgba(255,255,255,0.06)",
          overflow:     "hidden",
        }}>
          <div style={{
            height:       "100%",
            width:        `${Math.round(ratio * 100)}%`,
            background:   barColor,
            borderRadius: 99,
            transition:   "width .4s ease, background .4s ease",
            boxShadow:    `0 0 6px ${barColor}80`,
          }} />
        </div>
      )}
    </div>
  );
}

// ── Smart Suggestion alternatives ─────────────────────────────────────────────
const ALT_SUGGESTION: Record<string, string> = {
  rec_center:             "Consider checking Carlson Library or the Student Union for more space.",
  library:                "Consider the Student Union or Recreation Center as an alternative.",
  student_union:          "Consider Carlson Library or the Recreation Center for a quieter option.",
  north_engineering_bldg: "Consider Carlson Library for more available study space.",
};

// ── Main Card ─────────────────────────────────────────────────────────────────
interface Props {
  locationKey: string;
  data:        LocationState;
}

const OP_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  maintenance: { label: "Maintenance",  color: "var(--high)" },
  emergency:   { label: "Emergency",    color: "var(--critical)" },
  closed:      { label: "Closed",       color: "#94a3b8" },
};

export default function LocationCard({ locationKey, data }: Props) {
  const theme    = THEME[data.status];
  const meta     = META[locationKey] ?? { Icon: Cpu, subtitle: "Campus Facility", code: "??" };
  const { Icon } = meta;
  const isCrit   = data.status === "critical";
  const hasOpOverride = data.override_active && data.operational_status && data.operational_status !== "online";
  const opLabel  = hasOpOverride ? OP_STATUS_LABELS[data.operational_status!] : null;

  return (
    <div
      className="fade-up transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#001830]/80 cursor-default"
      style={{
        background:  "var(--bg-card)",
        borderRadius: 16,
        border:       `1px solid ${theme.border}`,
        boxShadow:    isCrit
          ? `0 4px 32px rgba(0,0,0,0.5), 0 0 40px ${theme.color}20`
          : "0 4px 24px rgba(0,0,0,0.45)",
        overflow:    "hidden",
        display:     "flex",
        flexDirection: "column",
      }}
    >
      {/* Coloured top accent */}
      <div style={{
        height:     3,
        background: `linear-gradient(90deg, ${theme.color}, ${theme.color}30)`,
        flexShrink: 0,
      }} />

      {/* Card body */}
      <div style={{ padding: "20px 22px 22px", flex: 1, display: "flex", flexDirection: "column" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "rgba(255,199,44,0.10)",
              border: "1px solid rgba(255,199,44,0.22)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <Icon size={18} color="var(--ut-gold)" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: "var(--text)", lineHeight: 1.2 }}>
                {data.name}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                {meta.subtitle}
              </div>
            </div>
          </div>

          {/* Status badges */}
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {hasOpOverride && opLabel && (
              <div style={{
                padding:       "5px 14px",
                borderRadius:  20,
                fontSize:      11,
                fontWeight:    800,
                letterSpacing: ".05em",
                color:         opLabel.color,
                background:    `${opLabel.color}18`,
                border:        `1px solid ${opLabel.color}44`,
              }}>
                {opLabel.label}
              </div>
            )}
            <div style={{
              padding:       "5px 14px",
              borderRadius:  20,
              fontSize:      11,
              fontWeight:    800,
              letterSpacing: ".05em",
              color:         theme.color,
              background:    theme.bg,
              border:        `1px solid ${theme.border}`,
            }}>
              {theme.label}
            </div>
          </div>
        </div>

        {/* ── Human-readable status sentence ── */}
        <div style={{
          display:      "flex",
          alignItems:   "center",
          gap:          8,
          marginBottom: 14,
          padding:      "8px 12px",
          borderRadius: 8,
          background:   theme.bg,
          border:       `1px solid ${theme.border}`,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: theme.color,
            boxShadow: `0 0 8px ${theme.color}`,
            flexShrink: 0,
          }} />
          <span style={{
            fontSize: 13, color: "rgba(255,255,255,0.7)",
            fontWeight: 500,
          }}>
            <strong style={{ color: theme.color, fontWeight: 700 }}>
              {Math.round(data.occupancy_ratio * 100)}% occupied
            </strong>
            {" — "}{theme.sentence}
          </span>
        </div>

        {/* ── SSI gauge ── */}
        <div style={{
          padding:      "12px 14px 10px",
          borderRadius: 10,
          background:   "rgba(0,0,0,0.22)",
          border:       "1px solid rgba(255,255,255,0.05)",
          marginBottom: 14,
        }}>
          <SegmentedGauge ssi={data.ssi} status={data.status} />
        </div>

        {/* ── Resources ── */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.25)", fontWeight: 700,
            fontFamily: "var(--font-mono)", marginBottom: 8,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
            AVAILABILITY
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
          </div>

          {Object.entries(data.resources).map(([key, res]) => (
            <ResourceRow
              key={key}
              label={key}
              current={res.current}
              capacity={res.capacity}
              resourceLabel={res.label}
            />
          ))}
        </div>

        {/* ── Smart Suggestion (only when SSI > 0.7) ── */}
        {data.ssi > 0.7 && (
          <div style={{
            marginTop:    12,
            padding:      "10px 14px",
            borderRadius: 8,
            background:   isCrit ? "rgba(231,76,60,0.08)" : "rgba(255,199,44,0.06)",
            border:       isCrit
              ? "1px solid rgba(231,76,60,0.25)"
              : "1px solid rgba(255,199,44,0.18)",
            display:      "flex",
            gap:          10,
            alignItems:   "flex-start",
          }}>
            <AlertTriangle
              size={14}
              color={isCrit ? "var(--critical)" : "var(--ut-gold)"}
              style={{ flexShrink: 0, marginTop: 2 }}
            />
            <div>
              <div style={{
                fontSize:      9,
                fontWeight:    700,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color:         isCrit ? "var(--critical)" : "var(--ut-gold)",
                fontFamily:    "var(--font-mono)",
                marginBottom:  4,
              }}>
                Suggestion
              </div>
              <div style={{
                fontSize:   12,
                lineHeight: 1.45,
                color:      "rgba(255,255,255,0.65)",
              }}>
                {isCrit
                  ? `High traffic. ${ALT_SUGGESTION[locationKey] ?? "We recommend checking a nearby building."}`
                  : `Usage is elevated. ${ALT_SUGGESTION[locationKey] ?? "Consider a lower-traffic alternative."}`
                }
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
