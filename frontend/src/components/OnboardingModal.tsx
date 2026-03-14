"use client";
import { useEffect } from "react";
import { X, Monitor, Clock, Compass } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    Icon:    Monitor,
    title:   "Monitor",
    body:    "See real-time estimated occupancy for each building and parking lot on campus.",
  },
  {
    Icon:    Clock,
    title:   "Predict",
    body:    "Drag the Time-Warp slider to preview how busy campus gets at any hour of the day.",
  },
  {
    Icon:    Compass,
    title:   "Navigate",
    body:    "Follow the color-coded status to find the best spots to study, eat, or park.",
  },
] as const;

const COLORS = [
  { color: "var(--low)",      label: "Quiet",   desc: "Plenty of space" },
  { color: "var(--moderate)", label: "Busy",    desc: "Filling up"      },
  { color: "var(--high)",     label: "Crowded", desc: "Limited spots"   },
  { color: "var(--critical)", label: "Full",    desc: "At capacity"     },
];

export default function OnboardingModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         9999,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        background:     "rgba(0,12,24,0.8)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width:        "100%",
          maxWidth:     540,
          background:   "#001830",
          border:       "1px solid rgba(255,199,44,0.25)",
          borderRadius: 16,
          boxShadow:    "0 24px 80px rgba(0,0,0,0.7)",
          overflow:     "hidden",
        }}
      >
        {/* Gold top accent */}
        <div style={{ height: 3, background: "linear-gradient(90deg, #FFC72C, #FFC72C40)" }} />

        <div style={{ padding: "28px 28px 24px" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div>
              <div style={{
                fontSize:      20,
                fontWeight:    800,
                color:         "#FFFFFF",
                lineHeight:    1.2,
                marginBottom:  4,
              }}>
                Welcome to UT Campus Twin
              </div>
              <div style={{
                fontSize:      12,
                color:         "rgba(255,255,255,0.45)",
              }}>
                Your real-time campus activity dashboard
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0,
              }}
            >
              <X size={16} color="rgba(255,255,255,0.5)" />
            </button>
          </div>

          {/* Steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {STEPS.map((step, i) => (
              <div key={i} style={{
                display: "flex", gap: 14, alignItems: "flex-start",
                padding: "14px 16px", borderRadius: 10,
                background: "rgba(0,58,112,0.2)",
                border: "1px solid rgba(255,199,44,0.10)",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: "rgba(255,199,44,0.10)",
                  border: "1px solid rgba(255,199,44,0.22)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <step.Icon size={16} color="#FFC72C" />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, fontFamily: "var(--font-mono)",
                      letterSpacing: ".1em", color: "rgba(255,199,44,0.5)",
                    }}>
                      0{i + 1}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF" }}>
                      {step.title}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.55)" }}>
                    {step.body}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Color legend */}
          <div style={{
            marginTop: 18, padding: "14px 16px", borderRadius: 10,
            background: "rgba(0,0,0,0.25)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: ".1em",
              textTransform: "uppercase", color: "rgba(255,255,255,0.35)",
              fontFamily: "var(--font-mono)", marginBottom: 10,
            }}>
              What the colors mean
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {COLORS.map((c) => (
                <div key={c.label} style={{
                  flex: 1, padding: "8px 0", borderRadius: 8, textAlign: "center",
                  background: `color-mix(in srgb, ${c.color} 12%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${c.color} 30%, transparent)`,
                }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: c.color, margin: "0 auto 6px",
                    boxShadow: `0 0 8px ${c.color}`,
                  }} />
                  <div style={{ fontSize: 12, fontWeight: 700, color: c.color }}>
                    {c.label}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                    {c.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{
            marginTop: 18, paddingTop: 14,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{
              fontSize: 11, color: "rgba(255,255,255,0.25)",
              fontFamily: "var(--font-mono)", letterSpacing: ".04em",
            }}>
              Powered by a live simulation engine
            </span>
            <button
              onClick={onClose}
              style={{
                padding: "8px 24px", borderRadius: 8,
                background: "#FFC72C", border: "none",
                fontSize: 13, fontWeight: 700, color: "#001830",
                cursor: "pointer", letterSpacing: ".03em",
              }}
            >
              Got It
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
