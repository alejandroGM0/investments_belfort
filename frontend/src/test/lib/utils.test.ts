import { describe, it, expect } from "vitest";
import { fmtPrice, fmtPct, fmtNumber, timeAgo } from "@/lib/utils";

describe("fmtPrice", () => {
  it("formats large prices with 2 decimals", () => {
    expect(fmtPrice(67200)).toBe("$67,200.00");
  });
});

describe("fmtPct", () => {
  it("adds + for positive values", () => {
    expect(fmtPct(2.5)).toBe("+2.50%");
  });
  it("keeps - for negative values", () => {
    expect(fmtPct(-1.8)).toBe("-1.80%");
  });
});

describe("fmtNumber", () => {
  it("formats millions as M", () => {
    expect(fmtNumber(1_500_000)).toBe("1.50M");
  });
  it("formats thousands as K", () => {
    expect(fmtNumber(48320)).toBe("48.3K");
  });
});
