import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TrendBadge } from "@/components/common/trend-badge";

describe("TrendBadge", () => {
  it("renders 'Alcista' for bullish", () => {
    render(<TrendBadge direction="bullish" />);
    expect(screen.getByText("Alcista")).toBeInTheDocument();
  });

  it("renders 'Bajista' for bearish", () => {
    render(<TrendBadge direction="bearish" />);
    expect(screen.getByText("Bajista")).toBeInTheDocument();
  });

  it("renders 'Lateral' for neutral", () => {
    render(<TrendBadge direction="neutral" />);
    expect(screen.getByText("Lateral")).toBeInTheDocument();
  });
});
