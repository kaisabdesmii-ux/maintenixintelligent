// Reliability & maintenance KPI calculations (pure functions, tested).

export type BreakdownLike = { downtime_hours: number | string | null; equipment_id?: string };

/** MTTR = total repair downtime / number of breakdowns (hours). */
export function mttr(breakdowns: BreakdownLike[]): number {
  if (!breakdowns.length) return 0;
  const total = breakdowns.reduce((s, b) => s + Number(b.downtime_hours ?? 0), 0);
  return total / breakdowns.length;
}

/** MTBF = (period hours - downtime) / number of failures (hours). */
export function mtbf(breakdowns: BreakdownLike[], periodHours: number): number {
  if (!breakdowns.length) return periodHours;
  const down = breakdowns.reduce((s, b) => s + Number(b.downtime_hours ?? 0), 0);
  return Math.max(0, periodHours - down) / breakdowns.length;
}

/** Availability = MTBF / (MTBF + MTTR), 0..1. */
export function availability(mtbfH: number, mttrH: number): number {
  if (mtbfH + mttrH === 0) return 1;
  return mtbfH / (mtbfH + mttrH);
}

/** RPN / IPR = Severity × Occurrence × Detection. */
export function rpn(s: number, o: number, d: number): number {
  return s * o * d;
}

export function rpnLevel(value: number): "low" | "medium" | "high" | "critical" {
  if (value >= 200) return "critical";
  if (value >= 120) return "high";
  if (value >= 60) return "medium";
  return "low";
}

export type StockLike = { quantity: number | string; min_stock: number | string };
export function stockState(p: StockLike): "out" | "low" | "ok" {
  const q = Number(p.quantity);
  if (q <= 0) return "out";
  if (q <= Number(p.min_stock)) return "low";
  return "ok";
}

/** Predictive risk score 0..100 from latest readings vs thresholds. */
export const THRESHOLDS = { temperature: 85, vibration: 4.5 };
export function riskScore(r: { temperature?: number | null; vibration?: number | null }): number {
  const t = Math.min(1, Math.max(0, (Number(r.temperature ?? 0) - 40) / (THRESHOLDS.temperature - 40)));
  const v = Math.min(1, Math.max(0, (Number(r.vibration ?? 0) - 1) / (THRESHOLDS.vibration - 1)));
  return Math.round((t * 0.5 + v * 0.5) * 100);
}
export function riskLevel(score: number): "low" | "medium" | "high" {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export const fmt = {
  num: (n: number, d = 0) => n.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d }),
  money: (n: number) => "$" + Math.round(n).toLocaleString("en-US"),
  pct: (n: number) => (n * 100).toFixed(1) + "%",
};
