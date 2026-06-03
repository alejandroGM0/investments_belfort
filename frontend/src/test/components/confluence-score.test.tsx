import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ConfluenceScore } from "@/components/summary/confluence-score";

describe("ConfluenceScore", () => {
  it("renders the score number", () => {
    render(<ConfluenceScore score={78} />);
    expect(screen.getByText("78")).toBeInTheDocument();
  });

  it("shows 'Señal Clara' for score >= 75", () => {
    render(<ConfluenceScore score={75} />);
    expect(screen.getByText("Señal Clara")).toBeInTheDocument();
  });

  it("shows 'Señal Moderada' for score 55–74", () => {
    render(<ConfluenceScore score={60} />);
    expect(screen.getByText("Señal Moderada")).toBeInTheDocument();
  });

  it("shows 'Señal Débil' for score 35–54", () => {
    render(<ConfluenceScore score={40} />);
    expect(screen.getByText("Señal Débil")).toBeInTheDocument();
  });
});
