import { describe, it, expect } from "vitest";
import { mttr, mtbf, availability, rpn, rpnLevel, stockState, riskScore, oee, healthScore, OEE_ASSUMPTIONS } from "@/lib/kpi";
import { weibullFit, weibullR, weibullF, weibullMedianTbf, pareto, timesBetweenFailures } from "@/lib/weibull";

describe("kpi", () => {
  const b = [{ downtime_hours: 4 }, { downtime_hours: 6 }];
  it("MTTR averages downtime", () => expect(mttr(b)).toBe(5));
  it("MTBF = uptime / failures", () => expect(mtbf(b, 1010)).toBe(500));
  it("availability = MTBF/(MTBF+MTTR)", () => expect(availability(495, 5)).toBeCloseTo(0.99));
  it("RPN = S×O×D", () => expect(rpn(9, 7, 4)).toBe(252));
  it("RPN >= 200 is critical", () => expect(rpnLevel(200)).toBe("critical"));
  it("stock at min is low, zero is out", () => {
    expect(stockState({ quantity: 3, min_stock: 3 })).toBe("low");
    expect(stockState({ quantity: 0, min_stock: 3 })).toBe("out");
  });
  it("risk reaches 100 at thresholds", () => expect(riskScore({ temperature: 85, vibration: 4.5 })).toBe(100));
  it("OEE = availability × performance × quality", () => {
    expect(oee(1)).toBeCloseTo(OEE_ASSUMPTIONS.performance * OEE_ASSUMPTIONS.quality);
    expect(oee(0.5, 1, 1)).toBe(0.5);
    expect(oee(2, 1, 1)).toBe(1);
  });
  it("health = 100 - risk, clamped at 0", () => {
    expect(healthScore(30)).toBe(70);
    expect(healthScore(150)).toBe(0);
  });
});

describe("weibull", () => {
  const tbf = [100, 200, 300, 400, 500];
  it("needs at least 3 points", () => {
    expect(weibullFit([100, 200])).toBeNull();
    expect(weibullFit([])).toBeNull();
  });
  it("fits beta and eta on a known dataset", () => {
    const p = weibullFit(tbf)!;
    expect(p).not.toBeNull();
    expect(p.beta).toBeGreaterThan(0);
    expect(p.eta).toBeGreaterThan(0);
    expect(p.n).toBe(5);
  });
  it("R(0)=1, R decreases, F=1-R", () => {
    const p = weibullFit(tbf)!;
    expect(weibullR(0, p)).toBe(1);
    expect(weibullR(1000, p)).toBeLessThan(weibullR(100, p));
    expect(weibullF(200, p)).toBeCloseTo(1 - weibullR(200, p));
  });
  it("median TBF is positive and finite", () => {
    const p = weibullFit(tbf)!;
    expect(weibullMedianTbf(p)).toBeGreaterThan(0);
  });
  it("timesBetweenFailures computes hour gaps", () => {
    const t = timesBetweenFailures(["2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z", "2026-01-04T12:00:00Z"]);
    expect(t).toEqual([24, 60]);
  });
});

describe("pareto", () => {
  it("sorts descending with cumulative % reaching 100", () => {
    const p = pareto({ a: 10, b: 30, c: 20 });
    expect(p.map((r) => r.key)).toEqual(["b", "c", "a"]);
    expect(p[0]!.pct).toBe(50);
    expect(p[2]!.cum).toBe(100);
  });
  it("flags the minimal set reaching 80%", () => {
    const p = pareto({ a: 50, b: 30, c: 20 });
    expect(p[0]!.in80).toBe(true);
    expect(p[1]!.in80).toBe(true); // 50+30=80
    expect(p[2]!.in80).toBe(false);
  });
  it("empty input gives empty result", () => {
    expect(pareto({})).toEqual([]);
    expect(pareto({ a: 0 })).toEqual([]);
  });
});
