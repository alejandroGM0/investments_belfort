"use client";

import { use, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { useBacktest } from "@/api/hooks/use-backtest";
import { JobProgressBanner } from "@/components/feedback/job-progress";
import { DisclaimerBanner } from "@/components/feedback/disclaimer-banner";
import { LoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { ErrorState } from "@/components/feedback/error-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Activity,
  AlertTriangle,
  BarChart2,
  Play,
  Clock,
  Target,
  Layers,
  CheckCircle2,
  Loader2,
  XCircle,
} from "lucide-react";
import { api } from "@/api/client";
import { toApiSymbol } from "@/lib/symbols";
import { useQueryClient } from "@tanstack/react-query";
import type { components } from "@/api/types";

type BacktestJob = components["schemas"]["BacktestJobSummary"];

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}
function pctSign(v: number) {
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-ES", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function modeLabel(mode?: string | null) {
  if (mode === "full") return "Grid completo (~243 combos/patrón)";
  if (mode === "quick") return "Grid rápido (~12 combos/patrón)";
  return "—";
}

function statusBadge(status?: string) {
  switch (status) {
    case "running":
      return (
        <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" /> En ejecución
        </Badge>
      );
    case "ready":
      return (
        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Resultados listos
        </Badge>
      );
    case "empty":
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Sin resultados
        </Badge>
      );
  }
}

function JobStatusCard({ title, job }: { title: string; job: BacktestJob }) {
  const failed = job.status === "failed";
  const done = job.status === "done";
  const running = job.status === "running" || job.status === "pending";
  const progress =
    job.progress_total && job.progress_total > 0
      ? Math.round(((job.progress_current ?? 0) / job.progress_total) * 100)
      : null;

  const result = job.result as Record<string, unknown> | null | undefined;

  return (
    <div className="rounded-lg border bg-card/50 p-4 space-y-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{title}</p>
        <Badge variant="secondary" className="text-xs">{modeLabel(job.mode)}</Badge>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        {running && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {done && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
        {failed && <XCircle className="h-3.5 w-3.5 text-red-500" />}
        <span className="capitalize">{job.status}</span>
        {job.finished_at && <span>· {fmtDate(job.finished_at)}</span>}
        {!job.finished_at && job.started_at && <span>· iniciado {fmtDate(job.started_at)}</span>}
      </div>
      {running && progress !== null && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{job.progress_message || "Procesando…"}</span>
            <span>{job.progress_current}/{job.progress_total} ({progress}%)</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      {done && result && (
        <p className="text-xs text-muted-foreground">
          {String(result.patterns_run ?? "?")} patrones · {String(result.combos_saved ?? "?")} combos guardados
        </p>
      )}
      {failed && result && typeof result.error === "string" && (
        <p className="text-xs text-red-500">{result.error}</p>
      )}
    </div>
  );
}

export default function StrategyPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: paramSymbol } = use(params);
  const symbol = paramSymbol.toUpperCase();
  const apiSymbol = toApiSymbol(symbol);
  const { timeframe } = useAppStore();
  const { data, isLoading, isError, refetch } = useBacktest(symbol, timeframe);
  const queryClient = useQueryClient();

  const [manualJobId, setManualJobId] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);

  async function launchFullGrid() {
    setLaunching(true);
    try {
      const { data: resp } = await api.POST("/backtest/{symbol}/refresh", {
        params: { path: { symbol: apiSymbol }, query: { tf: timeframe, mode: "full" } },
      });
      if (resp?.job_id) {
        setManualJobId(resp.job_id);
        queryClient.invalidateQueries({ queryKey: ["backtest", apiSymbol, timeframe] });
      }
    } finally {
      setLaunching(false);
    }
  }

  if (isLoading) return <div className="p-6"><LoadingSkeleton rows={6} /></div>;
  if (isError) return <div className="p-6"><ErrorState onRetry={refetch} /></div>;
  if (!data) return null;

  const { metrics, equity_curve, run_summary, selection, active_job, last_job, status, note } = data;
  const hasNoResults = metrics.total_trades === 0;
  const activeJobId = manualJobId ?? active_job?.id ?? null;

  const minEquity = Math.min(...(equity_curve?.map((e) => e.value) ?? [0]));
  const maxEquity = Math.max(...(equity_curve?.map((e) => e.value) ?? [1]));

  const params_ = selection?.params as Record<string, unknown> | undefined;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Activity className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-bold">Estrategia & Backtest · {symbol}</h2>
        <Badge variant="secondary">{data.strategy}</Badge>
        <Badge variant="outline">{timeframe}</Badge>
        {statusBadge(status)}
      </div>

      {note && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          <p className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {note}
          </p>
        </div>
      )}

      {/* Run summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Historial del backtest
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Última ejecución</p>
              <p className="font-medium mt-0.5">{fmtDate(run_summary?.last_run_at ?? data.updated_at)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Modo de grid</p>
              <p className="font-medium mt-0.5">{modeLabel(run_summary?.grid_mode)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Patrones con resultados</p>
              <p className="font-medium mt-0.5">{run_summary?.patterns_with_results ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Combos guardados</p>
              <p className="font-medium mt-0.5">{run_summary?.total_combos_saved ?? 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active / last job */}
      {(active_job || last_job) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {active_job && <JobStatusCard title="Job en curso" job={active_job} />}
          {last_job && !active_job && <JobStatusCard title="Último job completado" job={last_job} />}
          {last_job && active_job && (
            <JobStatusCard title="Job anterior" job={last_job} />
          )}
        </div>
      )}

      {/* Progress banner for manually launched job */}
      {activeJobId && (
        <JobProgressBanner
          jobId={activeJobId}
          label={active_job?.mode === "full" ? "Grid completo en ejecución" : "Backtest en ejecución"}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ["backtest", apiSymbol, timeframe] });
            setManualJobId(null);
          }}
        />
      )}

      {/* Selected strategy */}
      {selection && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Estrategia seleccionada
              <span className="text-xs font-normal text-muted-foreground">
                (mejor {selection.sort_metric ?? "sharpe"})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-lg">{selection.pattern_name}</span>
              {selection.pattern_category && (
                <Badge variant="outline">{selection.pattern_category}</Badge>
              )}
              <span className="text-xs text-muted-foreground font-mono">{selection.pattern_id}</span>
            </div>
            {params_ && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                <div className="rounded-lg border px-3 py-2">
                  <p className="text-xs text-muted-foreground">Stop Loss</p>
                  <p className="font-medium">{params_.sl_atr}× ATR</p>
                </div>
                <div className="rounded-lg border px-3 py-2">
                  <p className="text-xs text-muted-foreground">Take Profit</p>
                  <p className="font-medium">R:R {params_.tp_rr}</p>
                </div>
                <div className="rounded-lg border px-3 py-2">
                  <p className="text-xs text-muted-foreground">Filtro tendencia</p>
                  <p className="font-medium">{String(params_.filter_trend_label ?? params_.filter_trend ?? "—")}</p>
                </div>
                <div className="rounded-lg border px-3 py-2">
                  <p className="text-xs text-muted-foreground">Filtro RSI</p>
                  <p className="font-medium">{String(params_.filter_rsi_label ?? params_.filter_rsi ?? "—")}</p>
                </div>
                <div className="rounded-lg border px-3 py-2">
                  <p className="text-xs text-muted-foreground">Máx. velas en posición</p>
                  <p className="font-medium">
                    {params_.holding_bars_max != null ? String(params_.holding_bars_max) : "Sin límite"}
                  </p>
                </div>
                <div className="rounded-lg border px-3 py-2">
                  <p className="text-xs text-muted-foreground">Calculado el</p>
                  <p className="font-medium">{fmtDate(selection.run_at)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          onClick={launchFullGrid}
          disabled={launching || status === "running"}
          variant={hasNoResults ? "default" : "outline"}
          size="sm"
        >
          <Play className="mr-2 h-3.5 w-3.5" />
          {hasNoResults ? "Ejecutar backtest completo" : "Re-ejecutar grid completo"}
        </Button>
        {status === "running" && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Actualizando cada 3 s…
          </span>
        )}
      </div>

      {/* Metrics */}
      {!hasNoResults && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Operaciones", value: metrics.total_trades, icon: BarChart2, color: "" },
            {
              label: "Win Rate",
              value: pct(metrics.win_rate),
              icon: TrendingUp,
              color: metrics.win_rate > 0.5 ? "text-emerald-500" : "text-red-500",
            },
            {
              label: "Profit Factor",
              value: metrics.profit_factor.toFixed(2),
              icon: TrendingUp,
              color: metrics.profit_factor > 1 ? "text-emerald-500" : "text-red-500",
            },
            { label: "Max Drawdown", value: pctSign(metrics.max_drawdown), icon: AlertTriangle, color: "text-red-500" },
            {
              label: "Sharpe",
              value: metrics.sharpe.toFixed(2),
              icon: Activity,
              color: metrics.sharpe > 1 ? "text-emerald-500" : "text-yellow-500",
            },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="pt-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Equity curve */}
      {equity_curve && equity_curve.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Curva de equity — {selection?.pattern_name ?? "mejor estrategia"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-0.5 h-40">
              {equity_curve.map((point, i) => {
                const h = maxEquity > minEquity
                  ? ((point.value - minEquity) / (maxEquity - minEquity)) * 100
                  : 50;
                const isGain = i === 0 || point.value >= equity_curve[i - 1].value;
                return (
                  <div
                    key={i}
                    className="flex flex-1 flex-col items-center"
                    title={`${point.date}: ${point.value}`}
                  >
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
                {equity_curve.at(0)?.value?.toFixed(4)} → {equity_curve.at(-1)?.value?.toFixed(4)}
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
