"use client";
import { AlertTriangle, MapPin } from "lucide-react";
import type { LocationState, ParkingState } from "@/hooks/useCampusSocket";

interface Props {
  locations: Record<string, LocationState>;
  parking?:  ParkingState;
}

const ALTERNATIVES: Record<string, string> = {
  rec_center:    "SRFC — Student Recreation & Fitness Center (overflow capacity)",
  library:       "Engineering Building — Quiet study rooms, floors 2 & 3",
  student_union: "Rocket Hall Dining or Law Center Café",
};

const PARKING_ALTERNATIVES: Record<string, string> = {
  academic_core:     "Try Recreation Center Lot or Library Zone Lot",
  library_lot:       "Try Academic Core Lot or street parking on Bancroft St",
  student_union_lot: "Try Academic Core Lot or Library Zone Lot",
  rec_center_lot:    "Try Library Zone Lot or Academic Core Lot",
  north_engineering: "Try East Ramp Garage or Academic Core Lot",
};

const PARKING_NAMES: Record<string, string> = {
  academic_core:     "Academic Core Lot",
  library_lot:       "Library Zone Lot",
  student_union_lot: "Student Union Lot",
  rec_center_lot:    "Rec Center Lot",
  north_engineering: "North Engineering Lot",
};

export default function RecommendationBanner({ locations, parking }: Props) {
  const critical = Object.entries(locations).filter(([, loc]) => loc.status === "critical");
  const criticalParking = parking
    ? Object.entries(parking).filter(([, lot]) => lot.status === "critical")
    : [];
  // Admin-overridden lots (closed, full, reserved, maintenance) that aren't already critical
  const adminOverrideLots = parking
    ? Object.entries(parking).filter(([, lot]) =>
        lot.override_active && lot.operational_status && lot.operational_status !== "open"
        && lot.status !== "critical"
      )
    : [];
  // Admin-overridden buildings
  const adminOverrideBuildings = Object.entries(locations).filter(([, loc]) =>
    loc.override_active && loc.operational_status && loc.operational_status !== "online"
    && loc.status !== "critical"
  );
  if (critical.length === 0 && criticalParking.length === 0
      && adminOverrideLots.length === 0 && adminOverrideBuildings.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
      {critical.map(([key, loc]) => (
        <div
          key={key}
          className="pulse-alert fade-up"
          style={{
            display:      "flex",
            alignItems:   "center",
            gap:          16,
            padding:      "16px 22px",
            borderRadius: 14,
            background:   "linear-gradient(135deg, rgba(231,76,60,0.18) 0%, rgba(192,57,43,0.12) 100%)",
            border:       "1px solid rgba(231,76,60,0.55)",
            backdropFilter: "blur(4px)",
          }}
        >
          {/* Alert icon */}
          <div style={{
            flexShrink:    0,
            width:         44,
            height:        44,
            borderRadius:  12,
            background:    "rgba(231,76,60,0.20)",
            border:        "1px solid rgba(231,76,60,0.45)",
            display:       "flex",
            alignItems:    "center",
            justifyContent:"center",
          }}>
            <AlertTriangle size={22} color="#E74C3C" />
          </div>

          {/* Text content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Primary message */}
            <div style={{
              fontWeight:    700,
              fontSize:      14,
              color:         "#FDECEA",
              marginBottom:  5,
              display:       "flex",
              alignItems:    "center",
              gap:           8,
            }}>
              <span
                style={{
                  display:       "inline-block",
                  width:         8,
                  height:        8,
                  borderRadius:  "50%",
                  background:    "var(--critical)",
                  boxShadow:     "0 0 8px var(--critical)",
                }}
                className="gold-pulse"
              />
              {loc.name} is at capacity — try an alternative
            </div>

            {/* Alternative recommendation */}
            <div style={{
              display:    "flex",
              alignItems: "center",
              gap:        6,
              fontSize:   13,
              color:      "rgba(253,236,234,0.75)",
            }}>
              <MapPin size={13} color="var(--ut-gold)" style={{ flexShrink: 0 }} />
              <span>Recommended alternative: </span>
              <span style={{ color: "var(--ut-gold)", fontWeight: 600 }}>
                {ALTERNATIVES[key] ?? "Engineering Building"}
              </span>
            </div>
          </div>

          {/* SSI readout */}
          <div style={{
            flexShrink:  0,
            textAlign:   "center",
            padding:     "8px 16px",
            borderRadius: 10,
            background:  "rgba(231,76,60,0.18)",
            border:      "1px solid rgba(231,76,60,0.35)",
          }}>
            <div style={{
              fontFamily:    "var(--font-mono)",
              fontSize:      20,
              fontWeight:    800,
              color:         "var(--critical)",
            }}>
              {loc.ssi.toFixed(3)}
            </div>
            <div style={{ fontSize: 9, color: "rgba(231,76,60,0.7)", letterSpacing: ".1em", textTransform: "uppercase" }}>
              SSI
            </div>
          </div>
        </div>
      ))}

      {/* ── Parking critical banners ── */}
      {criticalParking.map(([key, lot]) => (
        <div
          key={key}
          className="pulse-alert fade-up"
          style={{
            display:      "flex",
            alignItems:   "center",
            gap:          16,
            padding:      "16px 22px",
            borderRadius: 14,
            background:   "linear-gradient(135deg, rgba(231,76,60,0.18) 0%, rgba(192,57,43,0.12) 100%)",
            border:       "1px solid rgba(231,76,60,0.55)",
          }}
        >
          <div style={{
            flexShrink: 0, width: 44, height: 44, borderRadius: 12,
            background: "rgba(231,76,60,0.20)", border: "1px solid rgba(231,76,60,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <AlertTriangle size={22} color="#E74C3C" />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#FDECEA", marginBottom: 5 }}>
              {lot.name} is nearly full — try another lot
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(253,236,234,0.75)" }}>
              <MapPin size={13} color="var(--ut-gold)" style={{ flexShrink: 0 }} />
              <span>Alternative: </span>
              <span style={{ color: "var(--ut-gold)", fontWeight: 600 }}>
                {lot.recommended_alternative
                  ? (PARKING_NAMES[lot.recommended_alternative] ?? lot.recommended_alternative)
                  : (PARKING_ALTERNATIVES[key] ?? "Try another campus lot")}
              </span>
            </div>
          </div>

          <div style={{
            flexShrink: 0, textAlign: "center", padding: "8px 16px",
            borderRadius: 10, background: "rgba(231,76,60,0.18)", border: "1px solid rgba(231,76,60,0.35)",
          }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 800, color: "var(--critical)" }}>
              ~{lot.estimated_available}
            </div>
            <div style={{ fontSize: 9, color: "rgba(231,76,60,0.7)", letterSpacing: ".1em", textTransform: "uppercase" }}>
              spots left
            </div>
          </div>
        </div>
      ))}

      {/* ── Admin-overridden parking banners (non-critical lots marked by admin) ── */}
      {adminOverrideLots.map(([key, lot]) => {
        const opLabel = lot.operational_status === "closed" ? "Closed"
          : lot.operational_status === "event_reserved" ? "Reserved for event operations"
          : lot.operational_status === "maintenance" ? "Under maintenance"
          : "Unavailable";
        return (
          <div
            key={`admin-p-${key}`}
            className="fade-up"
            style={{
              display: "flex", alignItems: "center", gap: 16,
              padding: "14px 22px", borderRadius: 14,
              background: "linear-gradient(135deg, rgba(255,199,44,0.10) 0%, rgba(243,156,18,0.06) 100%)",
              border: "1px solid rgba(255,199,44,0.35)",
            }}
          >
            <div style={{
              flexShrink: 0, width: 44, height: 44, borderRadius: 12,
              background: "rgba(255,199,44,0.12)", border: "1px solid rgba(255,199,44,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <AlertTriangle size={20} color="var(--ut-gold)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 4 }}>
                {lot.name} — {opLabel}
              </div>
              {lot.advisory_message && (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>
                  {lot.advisory_message}
                </div>
              )}
              {lot.recommended_alternative && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(255,255,255,0.65)" }}>
                  <MapPin size={13} color="var(--ut-gold)" style={{ flexShrink: 0 }} />
                  <span>Recommended: </span>
                  <span style={{ color: "var(--ut-gold)", fontWeight: 600 }}>
                    {PARKING_NAMES[lot.recommended_alternative] ?? lot.recommended_alternative}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* ── Admin-overridden building banners ── */}
      {adminOverrideBuildings.map(([key, loc]) => {
        const opLabel = loc.operational_status === "closed" ? "Closed"
          : loc.operational_status === "maintenance" ? "Under maintenance"
          : loc.operational_status === "emergency" ? "Emergency — avoid area"
          : "Unavailable";
        return (
          <div
            key={`admin-b-${key}`}
            className="fade-up"
            style={{
              display: "flex", alignItems: "center", gap: 16,
              padding: "14px 22px", borderRadius: 14,
              background: "linear-gradient(135deg, rgba(243,156,18,0.10) 0%, rgba(243,156,18,0.04) 100%)",
              border: "1px solid rgba(243,156,18,0.35)",
            }}
          >
            <div style={{
              flexShrink: 0, width: 44, height: 44, borderRadius: 12,
              background: "rgba(243,156,18,0.12)", border: "1px solid rgba(243,156,18,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <AlertTriangle size={20} color="var(--high)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
                {loc.name} — {opLabel}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                {ALTERNATIVES[key] ? `Try: ${ALTERNATIVES[key]}` : "Check campus alerts for updates."}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
