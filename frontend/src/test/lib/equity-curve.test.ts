import { describe, it, expect } from "vitest";
import { coalesceEquityCurve } from "@/lib/equity-curve";

describe("coalesceEquityCurve", () => {
  it("keeps full curves", () => {
    const curve = [
      { date: "2024-01-01", value: 1 },
      { date: "2024-06-01", value: 1.2 },
    ];
    const { points, estimated } = coalesceEquityCurve(curve);
    expect(points).toHaveLength(2);
    expect(estimated).toBe(false);
  });

  it("builds slope from legacy single point and metrics", () => {
    const { points, estimated } = coalesceEquityCurve([{ date: "0", value: 1 }], {
      total_trades: 54,
      avg_return: 0.018,
      total_return: 0.99,
    });
    expect(points).toHaveLength(2);
    expect(points[1].value).toBeGreaterThan(1);
    expect(estimated).toBe(true);
  });
});
