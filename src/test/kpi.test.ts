import { describe, it, expect } from "vitest";
import { mttr, mtbf, availability, rpn, rpnLevel, stockState, riskScore, oee, healthScore, OEE_ASSUMPTIONS } from "@/lib/kpi";

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
