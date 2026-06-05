"use client";

import { useState } from "react";
import {
  Play,
  Loader2,
  BarChart2,
  AlertTriangle,
  Layers,
  Info,
  History,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { JobProgressBanner } from "@/components/feedback/job-progress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EquityCurveChart } from "@/components/strategy/equity-curve-chart";
import { BacktestHistoryTable } from "@/components/strategy/backtest-history-table";
import { useBacktestRuns } from "@/api/hooks/use-backtest-runs";
import type { Timeframe } from "@/lib/env";
import type { components } from "@/api/types";

type BacktestRunItem = components["schemas"]["BacktestRunItem"];
type BacktestResponse = components["schemas"]["BacktestResponse"];

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-ES", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function fmtSlTp(params: Record<string, unknown> | undefined) {
  if (!params) return "—";
  const sl = params.sl_atr;
  const tp = params.tp_rr;
  if (sl == null && tp == null) return "—";
  return `SL ${sl ?? "?"}×ATR · R:R ${tp ?? "?"}`;
}

interface BacktestPanelProps {
  symbol: string;
  data: BacktestResponse;
  timeframe: string;
  selectedPatternId: string;
  onPatternChange: (id: string) => void;
  runMode: "quick" | "full";
  onRunModeChange: (m: "quick" | "full") => void;
  onLaunch: () => void;
  launching: boolean;
  activeJobId: string | null;
  onJobComplete: () => void;
  onSavePattern: (selection: {
    pattern_id: string;
    pattern_name?: string;
    pattern_category?: string | null;
    params?: Record<string, unknown>;
  }) => void;
}

export function BacktestPanel({
  symbol,
  data,
  timeframe,
  selectedPatternId,
  onPatternChange,
  runMode,
  onRunModeChange,
  onLaunch,
  launching,
  activeJobId,
  onJobComplete,
  onSavePattern,
}: BacktestPanelProps) {
  const [detailTab, setDetailTab] = useState<"summary" | "history">("summary");
  const [historySort, setHistorySort] = useState("sharpe");
  const [filterHistoryByPattern, setFilterHistoryByPattern] = useState(false);
  const [selectedHistoryRun, setSelectedHistoryRun] =
    useState<BacktestRunItem | null>(null);

  const top_patterns = data.top_patterns ?? [];
  const current =
    top_patterns.find((p) => p.selection.pattern_id === selectedPatternId) ??
    top_patterns[0];

  const hasAnyResults =
    (data.run_summary?.total_combos_saved ?? 0) > 0 || top_patterns.length > 0;

  const {
    data: runsData,
    isLoading: runsLoading,
    isError: runsError,
    refetch: refetchRuns,
  } = useBacktestRuns(symbol, timeframe as Timeframe, {
    patternId:
      filterHistoryByPattern && selectedPatternId
        ? selectedPatternId
        : undefined,
    sortBy: historySort,
    limit: 500,
    enabled: hasAnyResults,
  });

  const activeHistoryRun =
    selectedHistoryRun &&
    (!selectedPatternId || selectedHistoryRun.pattern_id === selectedPatternId)
      ? selectedHistoryRun
      : null;

  const metrics = activeHistoryRun?.metrics ?? current?.metrics ?? data.metrics;
  const hasResults = hasAnyResults && (metrics?.total_trades ?? 0) > 0;
  const equity =
    activeHistoryRun?.equity_curve ??
    current?.equity_curve ??
    data.equity_curve ??
    [];
  const selection = activeHistoryRun
    ? {
        pattern_id: activeHistoryRun.pattern_id,
        pattern_name: activeHistoryRun.pattern_name,
        pattern_category: activeHistoryRun.pattern_category,
        params: activeHistoryRun.params,
        run_at: activeHistoryRun.run_at,
      }
    : (current?.selection ?? data.selection);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/20 p-4">
        <div className="min-w-[180px] flex-1 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Modo de grid
          </label>
          <Select
            value={runMode}
            onValueChange={(v) => v && onRunModeChange(v as "quick" | "full")}
          >
            <SelectTrigger className="h-10 rounded-xl bg-card border-border/60 hover:bg-accent/50 hover:border-primary/40 transition-all font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quick">Rápido (~12 combos)</SelectItem>
              <SelectItem value="full">Completo (~243 combos)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={onLaunch}
          disabled={launching || data.status === "running"}
          variant={hasResults ? "outline" : "default"}
          className="gap-2"
        >
          {launching || data.status === "running" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {hasResults ? "Re-ejecutar" : "Ejecutar backtest"}
        </Button>
      </div>

      {data.note && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {data.note}
        </p>
      )}

      {activeJobId && (
        <JobProgressBanner
          jobId={activeJobId}
          label={runMode === "full" ? "Grid completo" : "Backtest rápido"}
          onComplete={onJobComplete}
        />
      )}

      {data.run_summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
          {[
            {
              label: "Última run",
              value: fmtDate(data.run_summary.last_run_at ?? data.updated_at),
            },
            {
              label: "Patrones",
              value: String(data.run_summary.patterns_with_results ?? 0),
            },
            {
              label: "Combos",
              value: String(data.run_summary.total_combos_saved ?? 0),
            },
            { label: "Modo", value: data.run_summary.grid_mode ?? "—" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="mt-0.5 font-medium truncate">{value}</p>
            </div>
          ))}
        </div>
      )}

      {!hasAnyResults ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          Sin resultados aún. Ejecuta el grid para rankear patrones (cada uno
          con su mejor combo SL/TP).
        </p>
      ) : (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex flex-col gap-1 font-medium sm:flex-row sm:items-center">
              <span className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4" />
                Ranking de patrones (motor v1)
              </span>
              {selection?.pattern_name && (
                <span className="text-xs font-normal text-muted-foreground">
                  Viendo métricas de:{" "}
                  <strong className="text-foreground">
                    {selection.pattern_name}
                  </strong>
                  {top_patterns.length > 1 &&
                    ` · ${top_patterns.length} en el ranking`}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-4">
            <Tabs
              value={detailTab}
              onValueChange={(v) => {
                if (!v) return;
                const tab = v as "summary" | "history";
                setDetailTab(tab);
                if (tab === "history") void refetchRuns();
              }}
            >
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="summary" className="gap-1.5 text-xs">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Resumen
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-1.5 text-xs">
                  <History className="h-3.5 w-3.5" />
                  Historial
                  {runsData?.total != null && (
                    <Badge
                      variant="secondary"
                      className="ml-1 h-4 px-1 text-[9px]"
                    >
                      {runsData.total}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="summary"
                className="mt-4 space-y-4 data-[hidden]:hidden"
              >
                {top_patterns.length > 1 && (
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-1.5 ml-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Elegir patrón del ranking
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground transition-colors cursor-help"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          side="top"
                          align="start"
                          className="w-72 p-3"
                        >
                          <div className="space-y-2 text-xs">
                            <h4 className="font-semibold">
                              No son “otras estrategias”
                            </h4>
                            <p className="text-muted-foreground">
                              Cada opción es un{" "}
                              <strong>patrón técnico distinto</strong> (señal de
                              entrada). El motor de riesgo (SL, TP, filtros) es
                              el mismo; lo que cambia es qué patrón disparó las
                              operaciones en el histórico.
                            </p>
                            <p className="text-muted-foreground">
                              La lista está ordenada por Sharpe: el #1 fue el
                              que mejor combinó ese patrón con sus mejores
                              parámetros SL/TP en este símbolo y timeframe.
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Select
                      value={
                        selectedPatternId ||
                        top_patterns[0].selection.pattern_id
                      }
                      onValueChange={(v) => v && onPatternChange(v)}
                    >
                      <SelectTrigger className="w-full h-auto py-3 px-4 bg-card hover:bg-accent/50 border-border/50 hover:border-primary/40 transition-all shadow-sm rounded-xl text-left [&>span]:w-full [&>span]:flex [&>span]:flex-col [&>span]:gap-1">
                        <SelectValue placeholder="Seleccionar patrón...">
                          {current && (
                            <div className="flex items-center justify-between w-full">
                              <span className="font-bold text-sm whitespace-normal">
                                {current.selection.pattern_name}
                              </span>
                              <Badge
                                variant={
                                  current.metrics.sharpe >= 1.5
                                    ? "default"
                                    : current.metrics.sharpe >= 1.0
                                      ? "secondary"
                                      : "outline"
                                }
                                className={`text-[10px] ml-2 shrink-0 ${current.metrics.sharpe >= 1.5 ? "bg-emerald-500 text-white" : ""}`}
                              >
                                SR {current.metrics.sharpe.toFixed(2)}
                              </Badge>
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-[400px] w-full min-w-[340px] p-2 rounded-xl z-[100]">
                        {top_patterns.map((p) => (
                          <SelectItem
                            key={p.selection.pattern_id}
                            value={p.selection.pattern_id}
                            className="py-2.5 px-3 rounded-lg mb-1 last:mb-0 cursor-pointer transition-colors"
                          >
                            <div className="flex flex-col gap-1.5 w-full pr-1 whitespace-normal">
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm leading-tight">
                                    {p.selection.pattern_name}
                                  </span>
                                  {p.selection.pattern_category && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] h-5 px-1.5 font-medium uppercase bg-background/50 shrink-0"
                                    >
                                      {p.selection.pattern_category}
                                    </Badge>
                                  )}
                                </div>
                                <Badge
                                  variant={
                                    p.metrics.sharpe >= 1.5
                                      ? "default"
                                      : p.metrics.sharpe >= 1.0
                                        ? "secondary"
                                        : "outline"
                                  }
                                  className={`text-xs ml-2 shrink-0 ${p.metrics.sharpe >= 1.5 ? "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent" : ""}`}
                                >
                                  SR {p.metrics.sharpe.toFixed(2)}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-0.5">
                                <div className="flex items-center gap-3">
                                  <span className="flex items-center gap-1">
                                    <div
                                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.metrics.win_rate >= 0.5 ? "bg-emerald-500" : "bg-red-500"}`}
                                    />
                                    WR: {pct(p.metrics.win_rate ?? 0)}
                                  </span>
                                  <span>TRD: {p.metrics.total_trades}</span>
                                </div>
                                <span className="font-medium text-foreground/70">
                                  PF:{" "}
                                  {(p.metrics.profit_factor ?? 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {activeHistoryRun && (
                  <p className="text-xs text-primary rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 mb-4">
                    Viendo combo del historial:{" "}
                    <strong>{activeHistoryRun.pattern_name}</strong>
                    {" · "}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => setSelectedHistoryRun(null)}
                    >
                      Volver al ranking
                    </button>
                  </p>
                )}

                {selection?.params && Object.keys(selection.params).length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-muted/10 px-3 py-2.5 text-xs mb-4">
                    <span className="font-semibold text-muted-foreground">Parámetros de riesgo del combo:</span>
                    <Badge variant="secondary" className="font-mono text-[10px] tracking-tight bg-background">
                      {fmtSlTp(selection.params as Record<string, unknown>)}
                    </Badge>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="ml-auto flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors bg-muted/30 hover:bg-muted/50 px-2 py-1 rounded-md"
                        >
                          <Info className="h-3 w-3" />
                          Explicación
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="top" align="end" className="w-80 p-3.5 z-[100]">
                        <div className="space-y-3 text-xs">
                          <div>
                            <h4 className="font-semibold text-sm">Parámetros SL y TP</h4>
                            <p className="text-muted-foreground mt-1">
                              Este es el ajuste exacto de Stop Loss y Take Profit que logró estos resultados con el patrón actual en las simulaciones históricas.
                            </p>
                          </div>
                          <div className="space-y-2 rounded-lg border border-border/50 bg-muted/30 p-2.5">
                            <p>
                              <strong className="text-foreground">SL (Stop Loss):</strong> Multiplicador basado en la volatilidad (ATR). Un valor de <strong>1.5×ATR</strong> significa que el límite de pérdida se ajusta a 1.5 veces el movimiento promedio del precio. Le da margen a la operación sin asumir un riesgo fijo ciego.
                            </p>
                            <p>
                              <strong className="text-foreground">R:R (Risk:Reward):</strong> Relación Riesgo-Beneficio. Un <strong>R:R 2</strong> significa que el objetivo de ganancias (Take Profit) se sitúa al doble de distancia que el Stop Loss. Si arriesgas 1%, buscas ganar un 2%.
                            </p>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                <TooltipProvider>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                    {[
                      {
                        label: "Trades",
                        value: metrics?.total_trades ?? 0,
                        desc: "Total de operaciones simuladas.",
                      },
                      {
                        label: "Win rate",
                        value: pct(metrics?.win_rate ?? 0),
                        color:
                          (metrics?.win_rate ?? 0) >= 0.5
                            ? "text-emerald-500 dark:text-emerald-400"
                            : "text-red-500 dark:text-red-400",
                        desc: "% de trades ganadores.",
                      },
                      {
                        label: "PF",
                        value: (metrics?.profit_factor ?? 0).toFixed(2),
                        color:
                          (metrics?.profit_factor ?? 0) >= 1.5
                            ? "text-emerald-500 dark:text-emerald-400"
                            : "text-foreground",
                        desc: "Profit Factor: ganancias / pérdidas.",
                      },
                      {
                        label: "Sharpe",
                        value: (metrics?.sharpe ?? 0).toFixed(2),
                        color:
                          (metrics?.sharpe ?? 0) >= 1.5
                            ? "text-emerald-500 dark:text-emerald-400"
                            : "text-foreground",
                        desc: "Retorno ajustado al riesgo.",
                      },
                      {
                        label: "Retorno",
                        value: pct(metrics?.total_return ?? 0),
                        color:
                          (metrics?.total_return ?? 0) >= 0
                            ? "text-emerald-500"
                            : "text-red-500",
                        desc: "Retorno acumulado de la curva (normalizado a 1).",
                      },
                      {
                        label: "DD",
                        value: pct(metrics?.max_drawdown ?? 0),
                        color: "text-red-500 dark:text-red-400",
                        desc: "Peor caída desde el pico.",
                      },
                      {
                        label: "Expect.",
                        value: pct(metrics?.expectancy ?? 0),
                        desc: "Ganancia esperada por trade.",
                      },
                      {
                        label: "Avg win",
                        value: pct(metrics?.avg_win ?? 0),
                        color: "text-emerald-600",
                        desc: "Media de trades ganadores.",
                      },
                      {
                        label: "Avg loss",
                        value: pct(metrics?.avg_loss ?? 0),
                        color: "text-red-500",
                        desc: "Media de trades perdedores.",
                      },
                      {
                        label: "Loss rate",
                        value: pct(metrics?.loss_rate ?? 0),
                        desc: "% de trades perdedores.",
                      },
                    ].map(({ label, value, color, desc }) => (
                      <Tooltip key={label}>
                        <TooltipTrigger className="flex flex-col items-center justify-center rounded-xl bg-card border border-border/50 px-2 py-3 text-center shadow-sm cursor-help hover:bg-accent/30 transition-colors">
                          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 border-b border-dotted border-muted-foreground/30">
                            {label}
                          </span>
                          <span
                            className={`text-base sm:text-lg font-bold tabular-nums leading-none ${color || ""}`}
                          >
                            {value}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent
                          side="bottom"
                          className="max-w-[200px] text-center"
                        >
                          <p>{desc}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </TooltipProvider>

                {selection && (
                  <div className="pt-2">
                    <Button
                      size="default"
                      variant="outline"
                      className="w-full gap-2 rounded-xl bg-background hover:bg-accent hover:text-accent-foreground border-border/60 transition-all font-medium"
                      onClick={() => onSavePattern(selection)}
                    >
                      <Layers className="size-4" />
                      Guardar patrón en Mi Estrategia
                    </Button>
                  </div>
                )}

                <div>
                  <div className="mb-2 flex items-center gap-1.5">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <BarChart2 className="h-3.5 w-3.5" />
                      Curva de equity
                    </p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground transition-colors cursor-help"
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        side="top"
                        align="start"
                        className="w-72 p-3"
                      >
                        <div className="space-y-2 text-xs">
                          <h4 className="font-semibold">
                            Curva de Equity (Evolución del capital)
                          </h4>
                          <p className="text-muted-foreground">
                            Muestra el rendimiento histórico simulado asumiendo un capital base de 1.0. Representa cómo habrían crecido (o disminuido) los fondos al operar las señales de este patrón.
                          </p>
                          <p className="text-muted-foreground">
                            Una curva ascendente constante indica fiabilidad, mientras que los picos seguidos de fuertes bajadas reflejan periodos de alto riesgo (Drawdown).
                          </p>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <EquityCurveChart
                    data={equity}
                    metrics={metrics ?? undefined}
                    estimated={
                      activeHistoryRun?.equity_curve_estimated ??
                      current?.equity_curve_estimated
                    }
                    height={180}
                  />
                </div>
              </TabsContent>

              <TabsContent
                value="history"
                className="mt-4 space-y-3 data-[hidden]:hidden"
              >
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1.5 min-w-[140px]">
                    <label className="text-xs font-medium text-muted-foreground">
                      Ordenar por
                    </label>
                    <Select
                      value={historySort}
                      onValueChange={(v) => v && setHistorySort(v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sharpe">Sharpe</SelectItem>
                        <SelectItem value="total_return">
                          Retorno total
                        </SelectItem>
                        <SelectItem value="profit_factor">
                          Profit factor
                        </SelectItem>
                        <SelectItem value="win_rate">Win rate</SelectItem>
                        <SelectItem value="total_trades">Nº trades</SelectItem>
                        <SelectItem value="run_at">Fecha</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedPatternId && top_patterns.length > 0 && (
                    <label className="flex items-center gap-2 pb-1 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="rounded border-border"
                        checked={filterHistoryByPattern}
                        onChange={(e) =>
                          setFilterHistoryByPattern(e.target.checked)
                        }
                      />
                      Solo patrón del ranking
                    </label>
                  )}
                </div>
                <BacktestHistoryTable
                  runs={runsData?.runs ?? []}
                  total={runsData?.total ?? 0}
                  selectedRunKey={activeHistoryRun?.run_key ?? null}
                  onSelect={(run) => {
                    setSelectedHistoryRun(run);
                    setDetailTab("summary");
                    onPatternChange(run.pattern_id);
                  }}
                  isLoading={runsLoading}
                  isError={runsError}
                  onRetry={() => void refetchRuns()}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
