"use client";
/**
 * ParkingMap.tsx
 * --------------
 * Google Maps visualization of campus parking zones.
 * Loads the Maps JS API via a <script> tag using NEXT_PUBLIC_GMAPS_KEY.
 * Falls back to a styled table when no API key is set.
 *
 * DO NOT modify WebSocket logic — this component is purely presentational.
 */

import { useEffect, useRef } from "react";
import { Car, MapPin } from "lucide-react";
import type { ParkingState, ParkingLot, StressStatus } from "@/hooks/useCampusSocket";

// ── Zone metadata (approximate UT campus coords) ──────────────────────────────
interface ZoneMeta {
  lat:   number;
  lng:   number;
  label: string;
  areas: string;
  alt:   string;
}

const ZONE_META: Record<string, ZoneMeta> = {
  academic_core: {
    lat: 41.6617, lng: -83.6120,
    label: "Academic Core Parking",
    areas: "Lots 13, 13N, 14, 12",
    alt:   "Try Library Zone or Rec Center Lot",
  },
  library_lot: {
    lat: 41.6638, lng: -83.6148,
    label: "Library Zone Parking",
    areas: "Lots 2, 3, 26",
    alt:   "Try Academic Core or Bancroft St parking",
  },
  student_union_lot: {
    lat: 41.6600, lng: -83.6128,
    label: "Student Union Parking",
    areas: "Lots 8, 9, 7N",
    alt:   "Try Academic Core or Library Zone Lot",
  },
  rec_center_lot: {
    lat: 41.6572, lng: -83.6100,
    label: "Rec Center Parking",
    areas: "Lots 5, 18",
    alt:   "Try Library Zone or Academic Core Lot",
  },
  north_engineering: {
    lat: 41.6653, lng: -83.6092,
    label: "North Engineering Parking",
    areas: "Lots 4, 20, East Ramp Garage",
    alt:   "Try Academic Core or East Ramp Garage",
  },
};

// ── Status colours ─────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<StressStatus, string> = {
  low:      "#27AE60",
  moderate: "#F1C40F",
  high:     "#E67E22",
  critical: "#E74C3C",
};

const STATUS_LABEL: Record<StressStatus, string> = {
  low:      "LOW",
  moderate: "MODERATE",
  high:     "HIGH",
  critical: "CRITICAL",
};

// ── Dark map style ─────────────────────────────────────────────────────────────
const DARK_STYLES = [
  { elementType: "geometry",           stylers: [{ color: "#0a1628" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0a1628" }] },
  { elementType: "labels.text.fill",   stylers: [{ color: "#7fb3c8" }] },
  { featureType: "administrative",      elementType: "geometry", stylers: [{ color: "#1a3a5c" }] },
  { featureType: "road",               elementType: "geometry", stylers: [{ color: "#193a5c" }] },
  { featureType: "road",               elementType: "labels.text.fill", stylers: [{ color: "#6fa8c0" }] },
  { featureType: "poi",                elementType: "geometry", stylers: [{ color: "#0d2035" }] },
  { featureType: "poi.park",           elementType: "geometry", stylers: [{ color: "#0d2a1a" }] },
  { featureType: "water",              elementType: "geometry", stylers: [{ color: "#040d1a" }] },
  { featureType: "transit",            stylers: [{ visibility: "off" }] },
];

// ── Fallback: table view when no API key ────────────────────────────────────────
function ParkingTable({ parking }: { parking: ParkingState }) {
  return (
    <div style={{ padding: "0 22px 22px" }}>
      <div style={{
        padding:      "10px 14px",
        borderRadius: 10,
        background:   "rgba(255,199,44,0.07)",
        border:       "1px solid rgba(255,199,44,0.2)",
        marginBottom: 16,
        display:      "flex",
        alignItems:   "center",
        gap:          10,
        fontSize:     12,
        color:        "rgba(255,199,44,0.8)",
      }}>
        <MapPin size={13} />
        Set <code style={{ fontFamily: "var(--font-mono)", margin: "0 4px" }}>NEXT_PUBLIC_GMAPS_KEY</code>
        in <code style={{ fontFamily: "var(--font-mono)", margin: "0 4px" }}>frontend/.env.local</code>
        to enable the interactive map.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {Object.entries(parking).map(([key, lot]: [string, ParkingLot]) => {
          const meta  = ZONE_META[key];
          const color = STATUS_COLOR[lot.status];
          const pct   = Math.round(lot.psi * 100);
          return (
            <div key={key} style={{
              borderRadius: 10,
              background:   "rgba(0,0,0,0.2)",
              border:       `1px solid ${color}44`,
              padding:      "12px 14px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                    {lot.name}
                  </div>
                  {meta && (
                    <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>
                      {meta.areas}
                    </div>
                  )}
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: ".07em",
                  padding: "3px 8px", borderRadius: 20,
                  color, background: `${color}18`, border: `1px solid ${color}44`,
                }}>
                  {STATUS_LABEL[lot.status]}
                </span>
              </div>
              {/* Fill bar */}
              <div style={{
                height: 5, borderRadius: 99,
                background: "rgba(255,255,255,0.07)", overflow: "hidden", marginBottom: 6,
              }}>
                <div style={{
                  height: "100%", width: `${pct}%`, background: color,
                  borderRadius: 99, transition: "width .4s ease",
                  boxShadow: `0 0 6px ${color}70`,
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                <span style={{ color: "var(--text-dim)" }}>{lot.occupied}/{lot.capacity} occupied</span>
                <span style={{ color, fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                  ~{lot.estimated_available} free
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
interface Props {
  parking: ParkingState;
  apiKey:  string;
}

export default function ParkingMap({ parking, apiKey }: Props) {
  const mapDivRef     = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef        = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef    = useRef<Record<string, any>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const infoWinRef    = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const googleRef     = useRef<any>(null);
  const loadedRef     = useRef(false);

  // Keep a ref to parking so click handlers always see fresh data
  const parkingRef    = useRef(parking);
  useEffect(() => { parkingRef.current = parking; }, [parking]);

  // ── Load Google Maps once ──
  useEffect(() => {
    if (loadedRef.current || !mapDivRef.current || !apiKey) return;
    loadedRef.current = true;

    // Avoid double-loading if script is already present
    if (!(window as any).google?.maps) {
      const script    = document.createElement("script");
      script.src      = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async    = true;
      script.onload   = initMap;
      script.onerror  = () => console.warn("Google Maps failed to load — check API key");
      document.head.appendChild(script);
    } else {
      initMap();
    }

    function initMap() {
      const g   = (window as any).google;
      googleRef.current = g;
      const map = new g.maps.Map(mapDivRef.current, {
        center:              { lat: 41.6620, lng: -83.6115 },
        zoom:                16,
        styles:              DARK_STYLES,
        mapTypeControl:      false,
        streetViewControl:   false,
        fullscreenControl:   false,
        zoomControlOptions:  { position: g.maps.ControlPosition.RIGHT_BOTTOM },
      });
      mapRef.current     = map;
      infoWinRef.current = new g.maps.InfoWindow();

      // Create markers for every zone
      Object.entries(ZONE_META).forEach(([key, meta]) => {
        const marker = new g.maps.Marker({
          position: { lat: meta.lat, lng: meta.lng },
          map,
          title: meta.label,
          icon:  circleIcon("#666666", g),
        });
        markersRef.current[key] = marker;

        marker.addListener("click", () => {
          const lot: ParkingLot = parkingRef.current[key as keyof ParkingState];
          if (!lot) return;
          const color = STATUS_COLOR[lot.status];
          infoWinRef.current.setContent(`
            <div style="background:#00264D;color:#fff;padding:14px 16px;border-radius:10px;
                        font-family:system-ui,sans-serif;min-width:200px;box-shadow:0 4px 16px rgba(0,0,0,0.5)">
              <div style="font-weight:700;font-size:14px;margin-bottom:4px">${meta.label}</div>
              <div style="font-size:11px;color:#8bc4d8;margin-bottom:10px">${meta.areas}</div>
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px">
                <span style="color:#aac">Occupied</span>
                <strong>${lot.occupied} / ${lot.capacity}</strong>
              </div>
              <div style="height:4px;border-radius:4px;background:rgba(255,255,255,0.1);margin-bottom:10px">
                <div style="height:100%;width:${Math.round(lot.psi * 100)}%;background:${color};border-radius:4px"></div>
              </div>
              <div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:12px">
                <span style="color:#aac">Est. Available</span>
                <strong style="color:${color}">~${lot.estimated_available}</strong>
              </div>
              <div style="font-size:10px;padding:6px 10px;border-radius:6px;
                          background:rgba(255,199,44,0.12);border:1px solid rgba(255,199,44,0.3);
                          color:#FFC72C;line-height:1.4">
                💡 ${meta.alt}
              </div>
            </div>
          `);
          infoWinRef.current.open(map, marker);
        });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  // ── Update marker colours on every parking tick ──
  useEffect(() => {
    if (!mapRef.current || !googleRef.current) return;
    const g = googleRef.current;
    Object.entries(parking).forEach(([key, lot]: [string, ParkingLot]) => {
      const marker = markersRef.current[key];
      if (!marker) return;
      marker.setIcon(circleIcon(STATUS_COLOR[lot.status], g));
    });
  }, [parking]);

  function circleIcon(color: string, g: any) {
    return {
      path:         g.maps.SymbolPath.CIRCLE,
      scale:        14,
      fillColor:    color,
      fillOpacity:  1,
      strokeColor:  "#FFFFFF",
      strokeWeight: 2,
    };
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const lots         = Object.values(parking) as ParkingLot[];
  const worstPsi     = Math.max(...lots.map((l) => l.psi));
  const overallColor = STATUS_COLOR[
    worstPsi >= 0.90 ? "critical" :
    worstPsi >= 0.70 ? "high"     :
    worstPsi >= 0.40 ? "moderate" : "low"
  ];
  const totalFree    = lots.reduce((s, l) => s + l.available, 0);

  return (
    <div
      className="fade-up"
      style={{
        background:   "var(--bg-card)",
        borderRadius: 16,
        border:       `1px solid ${overallColor}44`,
        boxShadow:    "0 4px 24px rgba(0,0,0,0.45)",
        overflow:     "hidden",
        marginTop:    22,
        transition:   "border-color .4s ease",
      }}
    >
      {/* Top accent */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${overallColor}, ${overallColor}30)` }} />

      {/* Header */}
      <div style={{
        padding:      "18px 22px",
        display:      "flex",
        alignItems:   "center",
        gap:          14,
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: "rgba(255,199,44,0.12)", border: "1px solid rgba(255,199,44,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Car size={20} color="var(--ut-gold)" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>Campus Parking Map</div>
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
            {apiKey ? "Click a marker for details" : "Interactive map — add API key to enable"}
          </div>
        </div>

        {/* Total free chip */}
        <div style={{
          marginLeft: "auto", textAlign: "center",
          padding: "6px 16px", borderRadius: 10,
          background: "rgba(0,0,0,0.25)", border: "1px solid var(--border)",
        }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 22,
            fontWeight: 800, color: overallColor,
          }}>
            {totalFree}
          </div>
          <div style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: ".08em", textTransform: "uppercase" }}>
            spots free
          </div>
        </div>

        {/* Status legend */}
        {apiKey && (
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {(["low", "moderate", "high", "critical"] as StressStatus[]).map((s) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: STATUS_COLOR[s],
                  boxShadow: `0 0 6px ${STATUS_COLOR[s]}80`,
                }} />
                <span style={{ fontSize: 10, color: "var(--text-dim)", textTransform: "capitalize" }}>
                  {s}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Map canvas OR table fallback */}
      {apiKey ? (
        <div ref={mapDivRef} style={{ height: 420, width: "100%" }} />
      ) : (
        <ParkingTable parking={parking} />
      )}
    </div>
  );
}
