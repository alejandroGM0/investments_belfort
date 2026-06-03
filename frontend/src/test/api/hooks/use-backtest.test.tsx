import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useBacktest } from "@/api/hooks/use-backtest";
import { api } from "@/api/client";

vi.mock("@/api/client", () => ({
  api: {
    GET: vi.fn(),
  },
}));

const mockData = {
  symbol: "BTCUSDT",
  tf: "4h",
  strategy: "v1",
  metrics: {
    total_trades: 15,
    win_rate: 0.65,
    profit_factor: 1.8,
    max_drawdown: -0.15,
    sharpe: 1.2,
    avg_return: 0.05,
  },
  equity_curve: [
    { date: "2024-01-01", value: 1.0 },
    { date: "2024-01-02", value: 1.05 },
  ],
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useBacktest hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches backtest data successfully", async () => {
    vi.mocked(api.GET).mockResolvedValueOnce({ data: mockData as any, error: undefined, response: {} as any });

    const { result } = renderHook(() => useBacktest("BTC", "4h"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
    expect(api.GET).toHaveBeenCalledWith("/backtest/{symbol}", {
      params: { path: { symbol: "BTCUSDT" }, query: { tf: "4h", strategy: "v1" } },
    });
  });

  it("handles empty results with note", async () => {
    const emptyData = {
      ...mockData,
      metrics: { ...mockData.metrics, total_trades: 0 },
      note: "Running quick backtest...",
    };
    vi.mocked(api.GET).mockResolvedValueOnce({ data: emptyData as any, error: undefined, response: {} as any });

    const { result } = renderHook(() => useBacktest("BTC", "4h"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.metrics.total_trades).toBe(0);
    expect((result.current.data as any).note).toBe("Running quick backtest...");
  });

  it("handles errors properly", async () => {
    vi.mocked(api.GET).mockResolvedValueOnce({ data: undefined, error: { message: "Not found" } as any, response: {} as any });

    const { result } = renderHook(() => useBacktest("BTC", "4h"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});
