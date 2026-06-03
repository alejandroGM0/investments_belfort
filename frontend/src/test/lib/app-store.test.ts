import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAppStore, type HistoryDepth } from "@/stores/app-store";

describe("AppStore", () => {
  it("has default history of 5y", () => {
    const { result } = renderHook(() => useAppStore());
    expect(result.current.history).toBe("5y");
  });

  it("setHistory updates the history value", () => {
    const { result } = renderHook(() => useAppStore());
    result.current.setHistory("max");
    expect(useAppStore.getState().history).toBe("max");
    // Reset
    result.current.setHistory("5y");
  });

  it("has default initJobIds as null", () => {
    const { result } = renderHook(() => useAppStore());
    expect(result.current.initJobIds).toBeNull();
  });

  it("setInitJobIds stores job IDs", () => {
    const { result } = renderHook(() => useAppStore());
    result.current.setInitJobIds({ dataJobId: "abc", backtestJobId: "def" });
    expect(useAppStore.getState().initJobIds).toEqual({
      dataJobId: "abc",
      backtestJobId: "def",
    });
    // Reset
    result.current.setInitJobIds(null);
  });

  it("supports all history depth values", () => {
    const values: HistoryDepth[] = ["2y", "5y", "max"];
    const { result } = renderHook(() => useAppStore());
    for (const v of values) {
      result.current.setHistory(v);
      expect(useAppStore.getState().history).toBe(v);
    }
  });
});
