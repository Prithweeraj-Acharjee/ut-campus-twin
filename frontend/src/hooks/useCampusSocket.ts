"use client";
/**
 * useCampusSocket
 * ---------------
 * Opens a WebSocket to the backend, auto-reconnects on close/error,
 * and returns the latest campus state snapshot together with
 * a connection status string and a helper to call REST endpoints.
 *
 * Mirrors the ConservaTwin usePLCSocket pattern.
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ── Env ────────────────────────────────────────────────────────────────────
const WS_URL  = process.env.NEXT_PUBLIC_WS_URL  ?? "ws://localhost:8000/ws";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Types (inline — mirrors shared/campus_model.ts) ───────────────────────
export type StressStatus = "low" | "moderate" | "high" | "critical";

export interface Resource {
  current:  number;
  capacity: number;
  label?:   string;
}

export interface LocationState {
  name:            string;
  occupancy_ratio: number;
  noise_level:     number;
  noise_label:     string;
  ssi:             number;
  status:          StressStatus;
  resources:       Record<string, Resource>;
  // Admin override fields (optional)
  operational_status?: BuildingOpStatus;
  override_active?:    boolean;
}

export type ParkingOpStatus = "open" | "full" | "closed" | "event_reserved" | "maintenance";
export type BuildingOpStatus = "online" | "maintenance" | "emergency" | "closed";

export interface ParkingLot {
  name:                string;
  capacity:            number;
  occupied:            number;
  available:           number;
  estimated_available: string;   // e.g. "10–20"
  psi:                 number;   // Parking Stress Index 0–1
  status:              StressStatus;
  // Admin override fields (optional — added by backend merge)
  operational_status?:      ParkingOpStatus;
  recommended_alternative?: string;
  advisory_message?:        string;
  override_active?:         boolean;
}

export interface ParkingState {
  academic_core:     ParkingLot;
  library_lot:       ParkingLot;
  student_union_lot: ParkingLot;
  rec_center_lot:    ParkingLot;
  north_engineering: ParkingLot;
}

export interface CampusState {
  type:           string;
  tick:           number;
  time:           string;
  sim_hour:       number;
  time_warp:      boolean;
  global_ssi:     number;
  global_status:  StressStatus;
  locations: {
    rec_center:             LocationState;
    library:                LocationState;
    student_union:          LocationState;
    north_engineering_bldg: LocationState;
  };
  parking: ParkingState;
  // Admin overlay fields (optional)
  global_alert?:     string;
  active_incident?:  string | null;
}

export type Connection = "connecting" | "connected" | "error" | "closed";

// ── Hook ──────────────────────────────────────────────────────────────────
export function useCampusSocket() {
  const [state,      setState]      = useState<CampusState | null>(null);
  const [connection, setConnection] = useState<Connection>("connecting");

  const wsRef   = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const connect = useCallback(() => {
    // Don't open a second socket if one is already alive
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnection("connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnection("connected");
      // Keep-alive ping every 10 s
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send("ping");
      }, 10_000);
    };

    ws.onmessage = (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data as string) as CampusState;
        if ((data as { type: string }).type === "pong") return;
        setState(data);
      } catch {
        // ignore malformed frames
      }
    };

    ws.onerror = () => setConnection("error");

    ws.onclose = () => {
      setConnection("closed");
      if (pingRef.current) clearInterval(pingRef.current);
      // Auto-reconnect after 2 s
      setTimeout(connect, 2_000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      if (pingRef.current) clearInterval(pingRef.current);
    };
  }, [connect]);

  /** POST to a REST endpoint on the backend. */
  const post = useCallback(async (path: string, body: object) => {
    await fetch(`${API_URL}${path}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
  }, []);

  return { state, connection, post };
}
