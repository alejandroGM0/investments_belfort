import { describe, it, expect } from "vitest";
import { toApiSymbol, toDisplaySymbol } from "@/lib/symbols";

describe("symbols", () => {
  it("toApiSymbol adds USDT", () => {
    expect(toApiSymbol("btc")).toBe("BTCUSDT");
    expect(toApiSymbol("ETH")).toBe("ETHUSDT");
  });

  it("toApiSymbol keeps full pair", () => {
    expect(toApiSymbol("BTCUSDT")).toBe("BTCUSDT");
  });

  it("toDisplaySymbol strips quote", () => {
    expect(toDisplaySymbol("BTCUSDT")).toBe("BTC");
  });
});
