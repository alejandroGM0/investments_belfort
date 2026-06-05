"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  coalesceEquityCurve,
  type EquityMetricsHint,
  type EquityPoint,
} from "@/lib/equity-curve";

export type { EquityPoint };

interface EquityCurveChartProps {
  data: EquityPoint[];
  metrics?: EquityMetricsHint;
  estimated?: boolean;
  className?: string;
  height?: number;
}

function buildPath(points: EquityPoint[]) {
  const values = points.map((p) => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  const pad = (max - min) * 0.08 || 0.05;
  min -= pad;
  max += pad;
  const w = 100;
  const h = 40;

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p.value - min) / (max - min)) * h;
    return { x, y };
  });

  const line = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`)
    .join(" ");
  const area = `${line} L ${w} ${h} L 0 ${h} Z`;

  return {
    path: line,
    areaPath: area,
    minV: min,
    maxV: max,
    endReturn: values[values.length - 1] - values[0],
    startLabel: points[0].date?.slice(0, 10) ?? "",
    endLabel: points[points.length - 1].date?.slice(0, 10) ?? "",
  };
}

export function EquityCurveChart({
  data,
  metrics,
  estimated: estimatedProp,
  className,
  height = 140,
}: EquityCurveChartProps) {
  const { points, estimated } = useMemo(
    () => coalesceEquityCurve(data, metrics),
    [data, metrics]
  );

  const isEstimated = estimatedProp ?? estimated;

  const chart = useMemo(() => buildPath(points), [points]);

  if (points.length < 2) {
    return (
      <div
        className={cn(
          "flex h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 px-4 text-center text-xs text-muted-foreground",
          className
        )}
      >
        <p>Sin datos para dibujar la curva.</p>
        <p className="text-[11px]">Ejecuta de nuevo el backtest (rápido o completo).</p>
      </div>
    );
  }

  const positive = chart.endReturn >= 0;
  const gradId = `eqFill-${positive ? "up" : "dn"}`;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{chart.startLabel || "—"}</span>
        <div className="flex items-center gap-2">
          {isEstimated && (
            <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
              Curva estimada
            </span>
          )}
          <span
            className={cn(
              "font-semibold tabular-nums",
              positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
            )}
          >
            Retorno acum. {(chart.endReturn * 100).toFixed(1)}%
          </span>
        </div>
        <span>{chart.endLabel || "—"}</span>
      </div>
      <div
        className="relative overflow-hidden rounded-xl border bg-gradient-to-b from-muted/30 to-muted/10"
        style={{ height }}
      >
        <svg
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
          className="h-full w-full block"
          role="img"
          aria-label="Curva de equity"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={positive ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)"}
                stopOpacity="0.35"
              />
              <stop offset="100%" stopColor="rgb(128, 128, 128)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line
            x1="0"
            y1="20"
            x2="100"
            y2="20"
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
          <path d={chart.areaPath} fill={`url(#${gradId})`} />
          <path
            d={chart.path}
            fill="none"
            stroke={positive ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)"}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="pointer-events-none absolute left-2 top-2 text-[10px] text-muted-foreground tabular-nums">
          {chart.maxV.toFixed(2)}
        </div>
        <div className="pointer-events-none absolute left-2 bottom-2 text-[10px] text-muted-foreground tabular-nums">
          {chart.minV.toFixed(2)}
        </div>
      </div>
      {isEstimated && (
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Los backtests guardados antes no tenían curva detallada. Re-ejecuta el grid para la curva
          barra a barra con fechas reales.
        </p>
      )}
    </div>
  );
}
