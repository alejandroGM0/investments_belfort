"use client";

import { use } from "react";
import { useAppStore } from "@/stores/app-store";
import { useBacktest } from "@/api/hooks/use-backtest";
import { DisclaimerBanner } from "@/components/feedback/disclaimer-banner";
import { LoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { ErrorState } from "@/components/feedback/error-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Activity, AlertTriangle, BarChart2 } from "lucide-react";

function pct(v: number) { return `${(v * 100).toFixed(1)}%`; }
function pctSign(v: number) { return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`; }

export default function StrategyPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: paramSymbol } = use(params);
  const symbol = paramSymbol.toUpperCase();
  const { timeframe } = useAppStore();
  const { data, isLoading, isError, refetch } = useBacktest(symbol, timeframe);

  if (isLoading) return <div className="p-6"><LoadingSkeleton rows={6} /></div>;
  if (isError) return <div className="p-6"><ErrorState onRetry={refetch} /></div>;
  if (!data) return null;

  const { metrics, equity_curve } = data;
  const minEquity = Math.min(...(equity_curve?.map((e) => e.value) ?? [0]));
  const maxEquity = Math.max(...(equity_curve?.map((e) => e.value) ?? [1]));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Activity className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-bold">Estrategia & Backtest · {symbol}</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{data.strategy}</span>
      </div>

      {/* Metrics grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Operaciones", value: metrics.total_trades, icon: BarChart2, color: "" },
          { label: "Win Rate", value: pct(metrics.win_rate), icon: TrendingUp, color: metrics.win_rate > 0.5 ? "text-emerald-500" : "text-red-500" },
          { label: "Profit Factor", value: metrics.profit_factor.toFixed(2), icon: TrendingUp, color: metrics.profit_factor > 1 ? "text-emerald-500" : "text-red-500" },
          { label: "Max Drawdown", value: pctSign(metrics.max_drawdown), icon: AlertTriangle, color: "text-red-500" },
          { label: "Sharpe", value: metrics.sharpe.toFixed(2), icon: Activity, color: metrics.sharpe > 1 ? "text-emerald-500" : "text-yellow-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Equity curve */}
      {equity_curve && equity_curve.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Curva de equity (backtest)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-0.5 h-40">
              {equity_curve.map((point, i) => {
                const h = ((point.value - minEquity) / (maxEquity - minEquity)) * 100;
                const isGain = i === 0 || point.value >= equity_curve[i - 1].value;
                return (
                  <div key={i} className="flex flex-1 flex-col items-center" title={`${point.date}: $${point.value.toLocaleString()}`}>
                    <div
                      className={`w-full rounded-t-sm ${isGain ? "bg-emerald-500/70" : "bg-red-500/70"}`}
                      style={{ height: `${Math.max(h, 2)}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{equity_curve.at(0)?.date}</span>
              <span className="font-medium text-foreground">
                ${equity_curve.at(0)?.value.toLocaleString()} → ${equity_curve.at(-1)?.value.toLocaleString()}
              </span>
              <span>{equity_curve.at(-1)?.date}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <DisclaimerBanner message="El backtest está basado en datos históricos con la estrategia seleccionada. Resultados pasados no garantizan resultados futuros. Opere con gestión de riesgo." />
    </div>
  );
}
