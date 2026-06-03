import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StrategyPage from "@/app/asset/[symbol]/strategy/page";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { api } from "@/api/client";

// Mocks
vi.mock("react", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    use: (p: any) => ({ symbol: "BTC" }), // mock use(params)
  };
});

vi.mock("@/stores/app-store", () => ({
  useAppStore: vi.fn(() => ({ timeframe: "4h" })),
}));

vi.mock("@/api/client", () => ({
  api: {
    POST: vi.fn(),
  },
}));

const mockBacktestData = {
  symbol: "BTCUSDT",
  strategy: "v1",
  tf: "4h",
  status: "ready" as const,
  metrics: {
    total_trades: 50,
    win_rate: 0.6,
    profit_factor: 1.5,
    max_drawdown: -0.1,
    sharpe: 1.1,
    avg_return: 0.02,
  },
  equity_curve: [
    { date: "2024-01-01", value: 1.0 },
    { date: "2024-01-02", value: 1.05 },
  ],
  updated_at: "2024-06-01T12:00:00Z",
  run_summary: {
    last_run_at: "2024-06-01T12:00:00Z",
    patterns_with_results: 40,
    total_combos_saved: 480,
    grid_mode: "quick" as const,
  },
  selection: {
    pattern_id: "cdl_engulfing",
    pattern_name: "Engulfing",
    pattern_category: "candles",
    sort_metric: "sharpe",
    params: { sl_atr: 1.5, tp_rr: 2.0, filter_trend: "sma200" },
  },
};

let mockUseBacktestReturn: any = {
  data: mockBacktestData,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};

vi.mock("@/api/hooks/use-backtest", () => ({
  useBacktest: vi.fn(() => mockUseBacktestReturn),
}));

vi.mock("@/api/hooks/use-job", () => ({
  useJob: vi.fn(() => ({ data: null })),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("StrategyPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBacktestReturn = {
      data: mockBacktestData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
  });

  it("renders loading skeleton", () => {
    mockUseBacktestReturn.isLoading = true;
    render(
      <Wrapper>
        <StrategyPage params={Promise.resolve({ symbol: "BTC" })} />
      </Wrapper>
    );
    expect(document.querySelector(".animate-pulse")).toBeDefined();
  });

  it("renders error state", () => {
    mockUseBacktestReturn.isError = true;
    mockUseBacktestReturn.isLoading = false;
    render(
      <Wrapper>
        <StrategyPage params={Promise.resolve({ symbol: "BTC" })} />
      </Wrapper>
    );
    expect(screen.getByText(/Error al cargar datos/i)).toBeDefined();
  });

  it("renders backtest metrics correctly", async () => {
    // Note: since the page uses `use(params)` inside the component, it might need to resolve asynchronously.
    // However, in React 19 testing, wrapping in React.Suspense or similar might be needed if `use` suspends.
    // Given the simple promise we pass, let's see if it renders synchronously or needs waitFor.
    render(
      <Wrapper>
        <StrategyPage params={Promise.resolve({ symbol: "BTC" })} />
      </Wrapper>
    );

    // Wait for the component to unwrap the promise and render
    await waitFor(() => {
      expect(screen.getByText("Estrategia & Backtest · BTC")).toBeDefined();
    });

    expect(screen.getByText("50")).toBeDefined(); // total trades
    expect(screen.getByText("60.0%")).toBeDefined(); // win rate
    expect(screen.getByText("1.50")).toBeDefined(); // profit factor
    expect(screen.getByText("-10.0%")).toBeDefined(); // drawdown
  });

  it("displays a note if present in data", async () => {
    mockUseBacktestReturn.data = {
      ...mockBacktestData,
      metrics: { ...mockBacktestData.metrics, total_trades: 0 },
      note: "No backtest results yet.",
    };

    render(
      <Wrapper>
        <StrategyPage params={Promise.resolve({ symbol: "BTC" })} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("No backtest results yet.")).toBeDefined();
    });
    // The "run full backtest" text changes based on hasNoResults
    expect(screen.getByText("Ejecutar backtest completo")).toBeDefined();
  });

  it("triggers full grid backtest when button clicked", async () => {
    vi.mocked(api.POST).mockResolvedValueOnce({ data: { job_id: "job123" } } as any);

    render(
      <Wrapper>
        <StrategyPage params={Promise.resolve({ symbol: "BTC" })} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Re-ejecutar grid completo")).toBeDefined();
    });

    const button = screen.getByRole("button", { name: /Re-ejecutar grid completo/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith("/backtest/{symbol}/refresh", {
        params: { path: { symbol: "BTCUSDT" }, query: { tf: "4h", mode: "full" } },
      });
    });
  });
});
