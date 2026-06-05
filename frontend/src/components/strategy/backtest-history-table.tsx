"use client";

import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { components } from "@/api/types";

type BacktestRunItem = components["schemas"]["BacktestRunItem"];

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

function fmtSlTp(params: Record<string, unknown> | undefined) {
  if (!params) return "—";
  const sl = params.sl_atr;
  const tp = params.tp_rr;
  if (sl == null && tp == null) return "—";
  return `SL ${sl ?? "?"}×ATR · R:R ${tp ?? "?"}`;
}

interface BacktestHistoryTableProps {
  runs: BacktestRunItem[];
  total: number;
  selectedRunKey: string | null;
  onSelect: (run: BacktestRunItem) => void;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function BacktestHistoryTable({
  runs,
  total,
  selectedRunKey,
  onSelect,
  isLoading,
  isError,
  onRetry,
}: BacktestHistoryTableProps) {
  if (isError) {
    return (
      <div className="py-10 text-center text-sm">
        <p className="text-destructive">No se pudo cargar el historial de backtests.</p>
        {onRetry && (
          <button
            type="button"
            className="mt-2 text-primary underline"
            onClick={() => onRetry()}
          >
            Reintentar
          </button>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando historial…
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No hay combos guardados. Ejecuta el grid para poblar el historial.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {runs.length} de {total} combinaciones guardadas · clic en una fila para ver curva y métricas
      </p>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead>
            <tr className="border-b bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2 font-semibold">Patrón</th>
              <th className="px-3 py-2 font-semibold">Parámetros</th>
              <th className="px-3 py-2 font-semibold text-right">Trades</th>
              <th className="px-3 py-2 font-semibold text-right">WR</th>
              <th className="px-3 py-2 font-semibold text-right">PF</th>
              <th className="px-3 py-2 font-semibold text-right">Sharpe</th>
              <th className="px-3 py-2 font-semibold text-right">Retorno</th>
              <th className="px-3 py-2 font-semibold text-right">DD</th>
              <th className="px-3 py-2 font-semibold">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => {
              const m = run.metrics;
              const selected = run.run_key === selectedRunKey;
              const ret = m?.total_return ?? 0;
              return (
                <tr
                  key={run.run_key}
                  onClick={() => onSelect(run)}
                  className={cn(
                    "cursor-pointer border-b border-border/40 transition-colors hover:bg-muted/30",
                    selected && "bg-primary/5"
                  )}
                >
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-foreground">{run.pattern_name}</div>
                    {run.pattern_category && (
                      <Badge variant="outline" className="mt-1 text-[9px] h-4 px-1">
                        {run.pattern_category}
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground max-w-[140px] truncate">
                    {fmtSlTp(run.params as Record<string, unknown>)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{m?.total_trades ?? 0}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{pct(m?.win_rate ?? 0)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {(m?.profit_factor ?? 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                    {(m?.sharpe ?? 0).toFixed(2)}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2.5 text-right tabular-nums font-medium",
                      ret >= 0 ? "text-emerald-600" : "text-red-500"
                    )}
                  >
                    {pct(ret)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-red-500">
                    {pct(m?.max_drawdown ?? 0)}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                    {run.run_at ? new Date(run.run_at).toLocaleDateString("es-ES") : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
