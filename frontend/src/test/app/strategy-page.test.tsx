import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import StrategyPage from "@/app/asset/[symbol]/strategy/page";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { api } from "@/api/client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), message: vi.fn() },
}));

vi.mock("react", async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    use: (p: Promise<{ symbol: string }>) => ({ symbol: "BTC" }),
  };
});

vi.mock("@/stores/app-store", () => ({
  useAppStore: vi.fn(() => ({ timeframe: "4h" })),
}));

vi.mock("@/stores/custom-strategies-store", () => ({
  useCustomStrategiesStore: vi.fn(() => ({
    strategies: [],
    activeStrategyId: null,
    addStrategy: vi.fn(() => "s1"),
    updateStrategy: vi.fn(),
    removeStrategy: vi.fn(),
    setActiveStrategy: vi.fn(),
    addFromRecommendedSetup: vi.fn(() => "s1"),
    addFromBacktest: vi.fn(() => "s2"),
  })),
}));

vi.mock("@/api/client", () => ({
  api: { POST: vi.fn() },
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
  top_patterns: [
    {
      metrics: {
        total_trades: 50,
        win_rate: 0.6,
        profit_factor: 1.5,
        max_drawdown: -0.1,
        sharpe: 1.1,
      },
      equity_curve: [{ date: "2024-01-01", value: 1.0 }],
      selection: {
        pattern_id: "cdl_engulfing",
        pattern_name: "Engulfing",
        pattern_category: "candles",
        params: { sl_atr: 1.5, tp_rr: 2.0 },
      },
    },
  ],
};

const mockAnalysis = {
  symbol: "BTCUSDT",
  tf: "4h",
  summary: {
    trend: "bullish" as const,
    confluence_score: 65,
    highlights: [],
    trade_setup: {
      entry: 50000,
      stop_loss: 48000,
      take_profit: 54000,
      risk_reward: 2,
      direction: "bullish" as const,
    },
  },
  groups: [],
  indicators: [],
  levels: [],
};

let mockUseBacktestReturn = {
  data: mockBacktestData,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};

let mockUseAnalysisReturn = {
  data: mockAnalysis,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};

vi.mock("@/api/hooks/use-backtest", () => ({
  useBacktest: vi.fn(() => mockUseBacktestReturn),
}));

vi.mock("@/api/hooks/use-analysis", () => ({
  useAnalysis: vi.fn(() => mockUseAnalysisReturn),
}));

vi.mock("@/api/hooks/use-job", () => ({
  useJob: vi.fn(() => ({ data: null })),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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
    mockUseAnalysisReturn = {
      data: mockAnalysis,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
  });

  it("renders strategy header, explanation link and recommended setup", async () => {
    render(
      <Wrapper>
        <StrategyPage params={Promise.resolve({ symbol: "BTC" })} />
      </Wrapper>
    );
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Estrategia" })).toBeDefined();
      expect(screen.getByRole("button", { name: /Guía/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /Usar en gráfico/i })).toBeDefined();
    });
  });

  it("opens guide sheet with tabbed content", async () => {
    render(
      <Wrapper>
        <StrategyPage params={Promise.resolve({ symbol: "BTC" })} />
      </Wrapper>
    );
    const link = await screen.findByRole("button", { name: /Guía/i });
    fireEvent.click(link);
    await waitFor(() => {
      expect(screen.getByText("Cómo usar Estrategia")).toBeDefined();
      expect(screen.getByText("En una frase:")).toBeDefined();
      expect(screen.getByRole("tab", { name: /Pasos/i })).toBeDefined();
    });
  });

  it("shows backtest metrics in grid tab", async () => {
    render(
      <Wrapper>
        <StrategyPage params={Promise.resolve({ symbol: "BTC" })} />
      </Wrapper>
    );
    const tab = await screen.findByRole("tab", { name: /Ranking por patrón/i });
    tab.click();
    await waitFor(() => {
      expect(screen.getByText("50")).toBeDefined();
    });
  });

  it("launches backtest with job id from response", async () => {
    vi.mocked(api.POST).mockResolvedValueOnce({
      data: { id: "job-abc", kind: "backtest_quick", status: "pending", created_at: "2024-01-01" },
    } as never);

    render(
      <Wrapper>
        <StrategyPage params={Promise.resolve({ symbol: "BTC" })} />
      </Wrapper>
    );
    const tab = await screen.findByRole("tab", { name: /Ranking por patrón/i });
    tab.click();
    const btn = await screen.findByRole("button", { name: /Re-ejecutar|Ejecutar backtest/i });
    btn.click();
    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith("/backtest/{symbol}/refresh", {
        params: { path: { symbol: "BTCUSDT" }, query: { tf: "4h", mode: "quick" } },
      });
    });
  });
});
