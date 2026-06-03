import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HistorySelect } from "@/components/selectors/history-select";

// Mock the zustand store
let currentHistory = "5y";
vi.mock("@/stores/app-store", () => ({
  useAppStore: vi.fn(() => ({
    history: currentHistory,
    setHistory: vi.fn((v: string) => { currentHistory = v; }),
  })),
}));

describe("HistorySelect", () => {
  it("renders with initial value", () => {
    currentHistory = "5y";
    render(<HistorySelect />);
    const select = screen.getByTitle("Profundidad histórica") as HTMLSelectElement;
    expect(select.value).toBe("5y");
  });

  it("has all 3 options", () => {
    render(<HistorySelect />);
    const options = screen.getAllByRole("option");
    expect(options.length).toBe(3);
    const values = options.map((o) => (o as HTMLOptionElement).value);
    expect(values).toEqual(["2y", "5y", "max"]);
  });

  it("has correct labels", () => {
    render(<HistorySelect />);
    expect(screen.getByText("2 años")).toBeDefined();
    expect(screen.getByText("5 años")).toBeDefined();
    expect(screen.getByText("Máximo")).toBeDefined();
  });
});
