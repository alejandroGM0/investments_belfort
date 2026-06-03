import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ScoreBadge } from "@/components/common/score-badge";

describe("ScoreBadge", () => {
  it("renders the score value", () => {
    render(<ScoreBadge score={78} />);
    expect(screen.getByText("78")).toBeInTheDocument();
  });

  it("applies green style for high score", () => {
    const { container } = render(<ScoreBadge score={80} />);
    expect(container.firstChild).toHaveClass("text-emerald-500");
  });

  it("applies yellow style for mid score", () => {
    const { container } = render(<ScoreBadge score={50} />);
    expect(container.firstChild).toHaveClass("text-yellow-500");
  });

  it("applies red style for low score", () => {
    const { container } = render(<ScoreBadge score={20} />);
    expect(container.firstChild).toHaveClass("text-red-500");
  });
});
