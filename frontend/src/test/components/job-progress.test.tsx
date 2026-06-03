import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { JobProgressBanner } from "@/components/feedback/job-progress";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock the useJob hook
const mockJobData = {
  id: "test-job-123",
  kind: "backtest_quick",
  status: "running" as const,
  progress_current: 5,
  progress_total: 20,
  progress_message: "Pattern: cdl_hammer",
  created_at: "2024-01-01T00:00:00Z",
};

vi.mock("@/api/hooks/use-job", () => ({
  useJob: vi.fn(() => ({ data: mockJobData })),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("JobProgressBanner", () => {
  it("renders nothing when jobId is null", () => {
    const { container } = render(
      <Wrapper><JobProgressBanner jobId={null} /></Wrapper>
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders progress info when job is running", () => {
    render(
      <Wrapper><JobProgressBanner jobId="test-job-123" label="Quick backtest" /></Wrapper>
    );
    expect(screen.getByText("Quick backtest")).toBeDefined();
    expect(screen.getByText("5/20 (25%)")).toBeDefined();
    expect(screen.getByText("Pattern: cdl_hammer")).toBeDefined();
  });

  it("renders custom label over kind", () => {
    render(
      <Wrapper><JobProgressBanner jobId="test-job-123" label="Mi tarea" /></Wrapper>
    );
    expect(screen.getByText("Mi tarea")).toBeDefined();
  });
});
