"use client";
/**
 * Dashboard.tsx — UToledo Smart Campus Digital Twin
 * All WebSocket / state logic is untouched.
 * Only layout & styling updated.
 */

import { useCallback, useEffect, useState } from "react";
import { Wifi, WifiOff, Clock, Gauge, Zap, HelpCircle, Shield, AlertTriangle } from "lucide-react";
import OnboardingModal from "@/components/OnboardingModal";
import { useCampusSocket, type Connection, type StressStatus } from "@/hooks/useCampusSocket";
import LocationCard from "@/components/LocationCard";
import RecommendationBanner from "@/components/RecommendationBanner";
import ParkingCard from "@/components/ParkingCard";
import ParkingMap from "@/components/ParkingMap";

const GMAPS_KEY = process.env.NEXT_PUBLIC_GMAPS_KEY ?? "";

// ── Helpers ────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<StressStatus, string> = {
  low:      "var(--low)",
  moderate: "var(--moderate)",
  high:     "var(--high)",
  critical: "var(--critical)",
};

const STATUS_BG: Record<StressStatus, string> = {
  low:      "var(--low-bg)",
  moderate: "var(--moderate-bg)",
  high:     "var(--high-bg)",
  critical: "var(--critical-bg)",
};

const STATUS_LABEL: Record<StressStatus, string> = {
  low:      "Quiet",
  moderate: "Busy",
  high:     "Crowded",
  critical: "Full",
};

const CONN_COLOR: Record<Connection, string> = {
  connected:  "var(--low)",
  connecting: "var(--moderate)",
  error:      "var(--critical)",
  closed:     "var(--critical)",
};

const SLIDER_MIN = 8;
const SLIDER_MAX = 22;   // 10 PM — matches simulator DEMO_CLOSE_H

function hourLabel(h: number) {
  const suffix = h < 12 ? "AM" : "PM";
  const h12    = Math.floor(h) % 12 || 12;
  const mins   = Math.round((h % 1) * 60);
  return `${h12}:${mins.toString().padStart(2, "0")} ${suffix}`;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  // ── All original logic preserved ──
  const { state, connection, post } = useCampusSocket();
  const [warpHour,   setWarpHour]   = useState<number>(12);
  const [warpActive, setWarpActive] = useState<boolean>(false);
  const [helpOpen,   setHelpOpen]   = useState<boolean>(false);

  // Auto-show onboarding on first visit
  useEffect(() => {
    const seen = localStorage.getItem("ut-twin-onboarded");
    if (!seen) {
      setHelpOpen(true);
      localStorage.setItem("ut-twin-onboarded", "1");
    }
  }, []);

  const applyWarp = useCallback(async (hour: number, active: boolean) => {
    setWarpHour(hour);
    setWarpActive(active);
    await post("/time-warp", { hour, active });
  }, [post]);

  const releaseWarp = useCallback(async () => {
    setWarpActive(false);
    await post("/time-warp", { hour: warpHour, active: false });
  }, [post, warpHour]);

  const locations = state?.locations;

  // Single source of truth for the displayed/slider time:
  // • warp ON  → use local warpHour (user is dragging)
  // • warp OFF → use backend sim_hour so slider tracks the live clock
  const displayHour = warpActive
    ? warpHour
    : Math.max(SLIDER_MIN, Math.min(SLIDER_MAX, state?.sim_hour ?? SLIDER_MIN));

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight:     "100vh",
      display:       "flex",
      flexDirection: "column",
      background:    "var(--bg)",
    }}>

      {/* ════════════════════════════════════════════════════════════════
          TOP BAR — UToledo Blue
      ════════════════════════════════════════════════════════════════ */}
      <header style={{
        position:       "sticky",
        top:            0,
        zIndex:         100,
        background:     "var(--ut-blue)",
        borderBottom:   "2px solid var(--ut-gold)",
        padding:        "0 28px",
        height:         64,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        boxShadow:      "0 4px 32px rgba(0,0,0,0.5)",
      }}>

        {/* ── LEFT: Wordmark ── */}
        <div style={{ flexShrink: 0 }}>
          <div className="text-xl font-black text-white" style={{
            letterSpacing: ".01em",
            lineHeight:    1.1,
          }}>
            UT Campus Twin
          </div>
          <div style={{
            fontSize:      10,
            color:         "rgba(255,199,44,0.85)",
            letterSpacing: ".1em",
            textTransform: "uppercase",
            marginTop:     2,
          }}>
            University of Toledo
          </div>
        </div>

        {/* ── CENTER: Metrics ── */}
        <div style={{
          display:        "flex",
          alignItems:     "center",
          gap:            32,
        }}>

          {/* Simulated time */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Clock size={16} color="rgba(255,199,44,0.7)" />
            <div>
              <div className="text-4xl font-black font-mono" style={{
                color:         warpActive ? "var(--ut-gold)" : "#FFFFFF",
                letterSpacing: ".05em",
                lineHeight:    1,
                textShadow:    warpActive ? "0 0 20px rgba(255,199,44,0.6)" : "none",
                transition:    "color .3s, text-shadow .3s",
              }}>
                {state?.time ?? "——:——"}
                {warpActive && (
                  <span style={{
                    fontSize:      11,
                    color:         "var(--ut-gold)",
                    marginLeft:    8,
                    fontWeight:    600,
                    letterSpacing: ".08em",
                  }}>
                    WARP
                  </span>
                )}
              </div>
              <div style={{
                fontSize:      9,
                color:         "rgba(255,255,255,0.45)",
                letterSpacing: ".12em",
                textTransform: "uppercase",
                marginTop:     2,
              }}>
                Simulated Time
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.12)" }} />

          {/* Global campus stress */}
          {state ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Gauge size={16} color={STATUS_COLOR[state.global_status]} />
              <div>
                <div style={{
                  fontSize:      15,
                  fontWeight:    800,
                  color:         STATUS_COLOR[state.global_status],
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  lineHeight:    1,
                }}>
                  {STATUS_LABEL[state.global_status]}
                </div>
                <div style={{
                  fontSize:      9,
                  color:         "rgba(255,255,255,0.45)",
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  marginTop:     2,
                }}>
                  Campus Activity
                </div>
              </div>
              {/* Global SSI chip */}
              <div style={{
                padding:       "4px 12px",
                borderRadius:  20,
                background:    STATUS_BG[state.global_status],
                border:        `1px solid ${STATUS_COLOR[state.global_status]}44`,
                fontFamily:    "var(--font-mono)",
                fontSize:      13,
                fontWeight:    700,
                color:         STATUS_COLOR[state.global_status],
              }}>
                {state.global_ssi.toFixed(3)}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
              Waiting for data…
            </div>
          )}
        </div>

        {/* ── RIGHT: Badges + Logo ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>

          {/* Live Telemetry indicator */}
          {connection === "connected" && (
            <div style={{
              display:    "flex",
              alignItems: "center",
              gap:        7,
              padding:    "6px 14px",
              borderRadius: 20,
              background:  "rgba(39,174,96,0.10)",
              border:      "1px solid rgba(39,174,96,0.30)",
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: "#27AE60",
                boxShadow:  "0 0 8px #27AE60",
                animation:  "goldPulse 2s ease-in-out infinite",
              }} />
              <span className="text-sm" style={{
                fontWeight:    700,
                color:         "rgba(39,174,96,0.9)",
                letterSpacing: ".08em",
                textTransform: "uppercase",
                fontFamily:    "var(--font-mono)",
              }}>
                Live Telemetry: Active
              </span>
            </div>
          )}

          {/* Connection status */}
          <div style={{
            display:    "flex",
            alignItems: "center",
            gap:        8,
            padding:    "6px 14px",
            borderRadius: 20,
            background:  "rgba(0,0,0,0.25)",
            border:      `1px solid ${CONN_COLOR[connection]}30`,
          }}>
            {connection === "connected"
              ? <Wifi size={14} color={CONN_COLOR[connection]} />
              : <WifiOff size={14} color={CONN_COLOR[connection]} />
            }
            <span style={{
              fontSize:      11,
              fontWeight:    600,
              color:         CONN_COLOR[connection],
              letterSpacing: ".07em",
              textTransform: "uppercase",
            }}>
              {connection}
            </span>
          </div>

          {/* Help button */}
          <button
            onClick={() => setHelpOpen(true)}
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          6,
              padding:      "6px 14px",
              borderRadius: 20,
              background:   "rgba(255,199,44,0.08)",
              border:       "1px solid rgba(255,199,44,0.25)",
              cursor:       "pointer",
              flexShrink:   0,
            }}
          >
            <HelpCircle size={14} color="#FFC72C" />
            <span style={{
              fontSize:      11,
              fontWeight:    700,
              color:         "rgba(255,199,44,0.85)",
              letterSpacing: ".07em",
              textTransform: "uppercase",
            }}>
              Help
            </span>
          </button>

          {/* Admin Portal link */}
          <a
            href="/admin"
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          6,
              padding:      "6px 14px",
              borderRadius: 20,
              background:   "rgba(255,255,255,0.05)",
              border:       "1px solid rgba(255,255,255,0.12)",
              cursor:       "pointer",
              textDecoration: "none",
              flexShrink:   0,
            }}
          >
            <Shield size={14} color="rgba(255,255,255,0.5)" />
            <span style={{
              fontSize:      11,
              fontWeight:    700,
              color:         "rgba(255,255,255,0.5)",
              letterSpacing: ".07em",
              textTransform: "uppercase",
            }}>
              Admin
            </span>
          </a>

          {/* UToledo Logo (far right) */}
          <div className="border-l-2 border-[#FFC72C]" style={{ height: 36, flexShrink: 0 }} />
          <img
            src="/utoledo-logo.png"
            alt="UToledo Logo"
            style={{ height: 40, maxHeight: 40, width: "auto", objectFit: "contain", flexShrink: 0 }}
          />
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════
          GLOBAL ALERT BANNER (admin-controlled)
      ════════════════════════════════════════════════════════════════ */}
      {state?.global_alert && (
        <div style={{
          padding:      "10px 28px",
          background:   "linear-gradient(90deg, rgba(231,76,60,0.15), rgba(231,76,60,0.06))",
          borderBottom: "1px solid rgba(231,76,60,0.25)",
          display:      "flex",
          alignItems:   "center",
          gap:          12,
        }}>
          <AlertTriangle size={16} color="var(--critical)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#FDECEA" }}>
            {state.global_alert}
          </span>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          MAIN CONTENT
      ════════════════════════════════════════════════════════════════ */}
      <main style={{ flex: 1, padding: "28px 28px 48px" }}>

        {/* ── Time Warp Panel ── */}
        <div style={{
          background:    "var(--bg-card)",
          borderRadius:  14,
          border:        "1px solid var(--border-gold)",
          padding:       "16px 22px",
          marginBottom:  24,
          display:       "flex",
          alignItems:    "center",
          gap:           20,
          flexWrap:      "wrap",
          boxShadow:     "0 4px 20px rgba(0,0,0,0.35)",
        }}>
          {/* Label */}
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "var(--ut-gold-dim)",
              border: "1px solid var(--ut-gold-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Zap size={16} color="var(--ut-gold)" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ut-gold)" }}>
                Time Travel
              </div>
              <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                Drag to preview campus at any hour
              </div>
            </div>
          </div>

          {/* Slider */}
          <div style={{ flex: 1, minWidth: 220, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11, color: "var(--text-dim)", flexShrink: 0 }}>8 AM</span>
            <div style={{ flex: 1, position: "relative" }}>
              {/* Gold filled track behind the input */}
              <div style={{
                position:     "absolute",
                top:          "50%",
                left:         0,
                height:       4,
                width:        `${((displayHour - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100}%`,
                background:   "var(--ut-gold)",
                borderRadius: 4,
                transform:    "translateY(-50%)",
                pointerEvents:"none",
                boxShadow:    "0 0 8px rgba(255,199,44,0.5)",
                transition:   "width .1s",
              }} />
              <input
                type="range"
                min={SLIDER_MIN}
                max={SLIDER_MAX}
                step={0.25}
                value={displayHour}
                onChange={(e) => applyWarp(parseFloat(e.target.value), true)}
                style={{ position: "relative", width: "100%", background: "transparent" }}
              />
            </div>
            <span style={{ fontSize: 11, color: "var(--text-dim)", flexShrink: 0 }}>10 PM</span>
          </div>

          {/* Time display */}
          <div style={{
            fontFamily:  "var(--font-mono)",
            fontSize:    20,
            fontWeight:  800,
            color:       warpActive ? "var(--ut-gold)" : "var(--text-dim)",
            flexShrink:  0,
            minWidth:    90,
            textAlign:   "right",
            textShadow:  warpActive ? "0 0 16px rgba(255,199,44,0.5)" : "none",
            transition:  "color .3s, text-shadow .3s",
          }}>
            {hourLabel(displayHour)}
          </div>

          {/* Resume button */}
          <button
            onClick={releaseWarp}
            disabled={!warpActive}
            style={{
              padding:       "8px 20px",
              borderRadius:  10,
              border:        warpActive ? "1px solid var(--ut-gold)" : "1px solid var(--border-hi)",
              background:    warpActive ? "var(--ut-gold)" : "transparent",
              color:         warpActive ? "#001830" : "var(--text-dim)",
              fontSize:      12,
              fontWeight:    700,
              cursor:        warpActive ? "pointer" : "default",
              letterSpacing: ".05em",
              transition:    "all .2s",
              flexShrink:    0,
            }}
          >
            {warpActive ? "▶  Resume Live" : "● Live"}
          </button>
        </div>

        {/* ── Recommendation banners ── */}
        {locations && <RecommendationBanner locations={locations} parking={state?.parking} />}

        {/* ── Location cards grid ── */}
        {locations ? (
          <>
            {/* Section title */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              marginBottom: 16,
            }}>
              <div style={{
                fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.5)",
                letterSpacing: ".06em", textTransform: "uppercase",
              }}>
                Building Status
              </div>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
              <div style={{
                fontSize: 11, color: "rgba(255,255,255,0.3)",
                fontFamily: "var(--font-mono)",
              }}>
                {Object.keys(locations).length} buildings monitored
              </div>
            </div>

            <div style={{
              display:             "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(272px, 1fr))",
              gap:                 22,
              marginBottom:        28,
            }}>
              {Object.entries(locations).map(([key, loc]) => (
                <LocationCard key={key} locationKey={key} data={loc} />
              ))}
            </div>

            {/* Parking section title */}
            {state?.parking && (
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                marginBottom: 16,
              }}>
                <div style={{
                  fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.5)",
                  letterSpacing: ".06em", textTransform: "uppercase",
                }}>
                  Parking Overview
                </div>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
              </div>
            )}

            {/* ── Parking card (full width) ── */}
            {state?.parking && <ParkingCard parking={state.parking} />}

            {/* ── Parking map (Google Maps visualization) ── */}
            {state?.parking && (
              <ParkingMap parking={state.parking} apiKey={GMAPS_KEY} />
            )}
          </>
        ) : (
          <div style={{
            textAlign:  "center",
            paddingTop: 100,
            color:      "var(--text-dim)",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-mid)" }}>
              Connecting to campus backend…
            </div>
            <div style={{ fontSize: 13, marginTop: 8 }}>
              Run <code style={{ color: "var(--ut-gold)" }}>python run.py</code> from the project root
            </div>
          </div>
        )}
      </main>

      {/* ════════════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════════════ */}
      <footer style={{
        height:       34,
        background:   "var(--ut-blue-dark)",
        borderTop:    "1px solid rgba(255,199,44,0.15)",
        display:      "flex",
        alignItems:   "center",
        padding:      "0 28px",
        gap:          16,
        fontSize:     11,
        color:        "rgba(255,255,255,0.35)",
        fontFamily:   "var(--font-mono)",
      }}>
        <span style={{ color: "rgba(255,199,44,0.6)", fontWeight: 700 }}>UToledo</span>
        <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
        <span>Smart Campus Digital Twin v1.0</span>
        <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
        <span>WS: {process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws"}</span>
        {state && (
          <>
            <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
            <span style={{ color: "rgba(255,255,255,0.25)" }}>tick #{state.tick}</span>
          </>
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: CONN_COLOR[connection],
            display: "inline-block",
            boxShadow: `0 0 6px ${CONN_COLOR[connection]}`,
          }} />
          <span>{connection.toUpperCase()}</span>
        </div>
      </footer>

      {/* ── Onboarding Modal ── */}
      <OnboardingModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
