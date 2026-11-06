import { useEffect, useRef, useState } from "react";
import { THRESHOLDS } from "@/lib/kpi";

export type LiveReading = {
  equipment_id: string;
  temperature: number;
  vibration: number;
  pressure: number;
  hours: number;
  at: string;
};

/**
 * Simulates live IoT streaming in the browser: small random fluctuations
 * around the latest stored reading. Never persisted to the database.
 */
export function useLiveTelemetry(base: LiveReading[], intervalMs = 3000): LiveReading[] {
  const [live, setLive] = useState<LiveReading[]>(base);
  const baseRef = useRef(base);
  baseRef.current = base;

  // Re-sync whenever the base readings recompute (e.g. sensor data arrives after equipment).
  useEffect(() => { setLive(baseRef.current); }, [base]);

  useEffect(() => {
    if (!base.length) return;
    const id = setInterval(() => {
      setLive((cur) =>
        (cur.length ? cur : baseRef.current).map((r) => ({
          ...r,
          temperature: +(r.temperature + (Math.random() - 0.5) * 0.8).toFixed(1),
          vibration: Math.max(0, +(r.vibration + (Math.random() - 0.5) * 0.15).toFixed(2)),
          pressure: +Math.max(0, Number(r.pressure) + (Math.random() - 0.5) * 0.1).toFixed(2),
          hours: +(r.hours + intervalMs / 3.6e6).toFixed(2),
          at: new Date().toISOString(),
        }))
      );
    }, intervalMs);
    return () => clearInterval(id);
  }, [base, intervalMs]);

  return live;
}

export type TelemetryLevel = "normal" | "warning" | "critical";

const LIMITS = {
  temperature: { warn: 75, crit: THRESHOLDS.temperature },
  vibration: { warn: 3.2, crit: THRESHOLDS.vibration },
  pressure: { warn: 8, crit: 9.5 },
} as const;

export function telemetryLevel(kind: keyof typeof LIMITS, v: number): TelemetryLevel {
  const lim = LIMITS[kind];
  if (v >= lim.crit) return "critical";
  if (v >= lim.warn) return "warning";
  return "normal";
}

export const TELEMETRY_LIMITS = LIMITS;
