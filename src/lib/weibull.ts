// Reliability engineering: Weibull estimation and Pareto analysis (pure functions, tested).
// Weibull parameters are estimated by median-rank regression on times between failures (TBF).
// This is a statistical model — always labeled as such in the UI, never presented as measured data.

export type WeibullParams = { beta: number; eta: number; n: number };

/** Median rank (Benard approximation) for failure i (1-based) out of n. */
export function medianRank(i: number, n: number): number {
  return (i - 0.3) / (n + 0.4);
}

/**
 * Fit Weibull β (shape) and η (scale, hours) from times between failures.
 * Needs at least 3 points; returns null otherwise (insufficient data).
 */
export function weibullFit(tbf: number[]): WeibullParams | null {
  const xs = tbf.filter((t) => t > 0).sort((a, b) => a - b);
  const n = xs.length;
  if (n < 3) return null;
  const pts = xs.map((t, i) => ({ x: Math.log(t), y: Math.log(-Math.log(1 - medianRank(i + 1, n))) }));
  const mx = pts.reduce((s, p) => s + p.x, 0) / n;
  const my = pts.reduce((s, p) => s + p.y, 0) / n;
  let sxx = 0, sxy = 0;
  for (const p of pts) { sxx += (p.x - mx) ** 2; sxy += (p.x - mx) * (p.y - my); }
  if (sxx === 0) return null;
  const beta = sxy / sxx;
  const eta = Math.exp((beta * mx - my) / beta);
  return { beta: +beta.toFixed(3), eta: +eta.toFixed(1), n };
}

/** Reliability R(t) = exp[-(t/η)^β] */
export function weibullR(t: number, p: WeibullParams): number {
  return Math.exp(-((t / p.eta) ** p.beta));
}
/** Failure probability F(t) = 1 - R(t) */
export function weibullF(t: number, p: WeibullParams): number {
  return 1 - weibullR(t, p);
}
/** Failure rate λ(t) = (β/η)(t/η)^(β-1), per hour */
export function weibullLambda(t: number, p: WeibullParams): number {
  if (t <= 0) return p.beta < 1 ? Infinity : 0;
  return (p.beta / p.eta) * (t / p.eta) ** (p.beta - 1);
}
/** Median time between failures = η·(ln 2)^(1/β) */
export function weibullMedianTbf(p: WeibullParams): number {
  return p.eta * Math.LN2 ** (1 / p.beta);
}

/** Empirical reliability points from observed TBF (real measured data). */
export function empiricalReliability(tbf: number[]): { t: number; r: number }[] {
  const xs = tbf.filter((t) => t > 0).sort((a, b) => a - b);
  return xs.map((t, i) => ({ t, r: +(1 - medianRank(i + 1, xs.length)).toFixed(4) }));
}

/** Times between failures (hours) from sorted breakdown ISO dates. */
export function timesBetweenFailures(occurredAts: string[]): number[] {
  const ts = occurredAts.map((s) => new Date(s).getTime()).sort((a, b) => a - b);
  const out: number[] = [];
  for (let i = 1; i < ts.length; i++) out.push((ts[i]! - ts[i - 1]!) / 36e5);
  return out;
}

// ---------- Pareto ----------

export type ParetoRow = { key: string; value: number; pct: number; cum: number; in80: boolean };

/**
 * Pareto analysis: categories sorted by descending value, individual %,
 * cumulative %, and the minimal set of categories reaching ≥ 80%.
 */
export function pareto(values: Record<string, number>): ParetoRow[] {
  const arr = Object.entries(values).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const total = arr.reduce((s, [, v]) => s + v, 0);
  if (!total) return [];
  let cum = 0;
  let reached = false;
  return arr.map(([key, value]) => {
    const pct = (value / total) * 100;
    cum += pct;
    const in80 = !reached;
    if (cum >= 80) reached = true;
    return { key, value: +value.toFixed(2), pct: +pct.toFixed(1), cum: +Math.min(100, cum).toFixed(1), in80 };
  });
}
