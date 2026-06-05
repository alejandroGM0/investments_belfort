export interface EquityPoint {
  date: string;
  value: number;
}

export interface EquityMetricsHint {
  total_return?: number;
  expectancy?: number;
  total_trades?: number;
}

/** Build at least 2 points for charting when API/DB data is legacy or sparse. */
export function coalesceEquityCurve(
  curve: EquityPoint[] | undefined,
  metrics?: EquityMetricsHint
): { points: EquityPoint[]; estimated: boolean } {
  const clean = (curve ?? []).filter((p) => Number.isFinite(p.value));
  if (clean.length >= 2) {
    return { points: clean, estimated: false };
  }

  let totalReturn = metrics?.total_return ?? 0;
  if (!totalReturn && clean.length === 1) {
    totalReturn = clean[0].value - 1;
  }
  const n = metrics?.total_trades ?? 0;
  const avg = (metrics as { avg_return?: number })?.avg_return;
  if (!totalReturn && avg && n) {
    totalReturn = avg * n;
  }
  if (!totalReturn && metrics?.expectancy && n) {
    totalReturn = metrics.expectancy * n;
  }
  const pf = (metrics as { profit_factor?: number })?.profit_factor;
  if (!totalReturn && pf && pf > 1) {
    totalReturn = (pf - 1) * 0.25;
  }

  const start = clean[0]?.date && !/^\d+$/.test(clean[0].date) ? clean[0].date : "inicio";
  return {
    points: [
      { date: start.slice(0, 10), value: 1 },
      { date: "hoy", value: 1 + totalReturn },
    ],
    estimated: true,
  };
}
