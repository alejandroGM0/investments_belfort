"use client";

import { use, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { usePatternsAll } from "@/api/hooks/use-patterns-all";
import { LoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { ErrorState } from "@/components/feedback/error-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, ChevronDown, ChevronRight } from "lucide-react";

const STATUS_COLORS = {
  active: "bg-emerald-500 text-white",
  recent: "bg-amber-500 text-white",
  inactive: "bg-muted text-muted-foreground",
} as const;

const STATUS_LABELS = {
  active: "Activo",
  recent: "Reciente",
  inactive: "Inactivo",
} as const;

const CATEGORY_LABELS: Record<string, string> = {
  candles: "Velas japonesas",
  chart_patterns: "Figuras chartistas",
  structure: "Estructura de mercado",
  indicators: "Indicadores",
  levels: "Niveles clave",
};

const DIRECTION_ICON: Record<number, string> = {
  1: "↑",
  [-1]: "↓",
  0: "—",
};

export default function PatternsPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: paramSymbol } = use(params);
  const symbol = paramSymbol.toUpperCase();
  const { timeframe, history } = useAppStore();
  const { data, isLoading, isError, refetch } = usePatternsAll(symbol, timeframe, history);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(Object.keys(CATEGORY_LABELS)));

  if (isLoading) return <div className="p-6"><LoadingSkeleton rows={10} /></div>;
  if (isError) return <div className="p-6"><ErrorState onRetry={refetch} /></div>;
  if (!data) return null;

  // Group patterns by category
  const grouped = new Map<string, typeof data.patterns>();
  for (const p of data.patterns ?? []) {
    const cat = p.category ?? "other";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(p);
  }

  function toggleCategory(cat: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Layers className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-bold">Patrones completos · {symbol}</h2>
      </div>

      {/* Summary stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Activos", count: data.active, color: "text-emerald-500" },
          { label: "Recientes (≤5 velas)", count: data.recent, color: "text-amber-500" },
          { label: "Inactivos", count: data.inactive, color: "text-muted-foreground" },
        ].map(({ label, count, color }) => (
          <Card key={label}>
            <CardContent className="flex items-baseline justify-between pt-5">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className={`text-2xl font-bold tabular-nums ${color}`}>{count}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Total: {data.total_patterns} patrones analizados · TF: {data.tf}
      </p>

      {/* Patterns grouped by category */}
      <div className="space-y-4">
        {Array.from(grouped.entries())
          .sort(([a], [b]) => {
            const order = Object.keys(CATEGORY_LABELS);
            return order.indexOf(a) - order.indexOf(b);
          })
          .map(([category, patterns]) => {
            const isExpanded = expandedCategories.has(category);
            const activeCount = patterns.filter((p) => p.status === "active").length;

            return (
              <Card key={category}>
                <CardHeader
                  className="cursor-pointer select-none"
                  onClick={() => toggleCategory(category)}
                >
                  <CardTitle className="flex items-center gap-3 text-sm">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    {CATEGORY_LABELS[category] ?? category}
                    <span className="ml-auto flex items-center gap-2">
                      {activeCount > 0 && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          {activeCount} activos
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">{patterns.length} patrones</span>
                    </span>
                  </CardTitle>
                </CardHeader>

                {isExpanded && (
                  <CardContent>
                    <div className="divide-y">
                      {patterns
                        .sort((a, b) => {
                          const statusOrder = { active: 0, recent: 1, inactive: 2 };
                          const so = (statusOrder[a.status as keyof typeof statusOrder] ?? 2) - (statusOrder[b.status as keyof typeof statusOrder] ?? 2);
                          return so !== 0 ? so : a.name.localeCompare(b.name);
                        })
                        .map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center gap-3 py-2.5 text-sm"
                          >
                            <span
                              className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_COLORS[p.status as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.inactive}`}
                            >
                              {STATUS_LABELS[p.status as keyof typeof STATUS_LABELS] ?? p.status}
                            </span>

                            <span className="min-w-0 flex-1 truncate font-medium">
                              {p.name}
                            </span>

                            {p.direction !== 0 && (
                              <span className={`text-base ${p.direction === 1 ? "text-emerald-500" : "text-red-500"}`}>
                                {DIRECTION_ICON[p.direction] ?? "—"}
                              </span>
                            )}

                            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                              {p.occurrences_last_100_bars ?? 0}×/100
                            </span>

                            {p.last_occurrence_bars_ago != null && (
                              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                                {p.last_occurrence_bars_ago === 0 ? "ahora" : `${p.last_occurrence_bars_ago} velas`}
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
      </div>
    </div>
  );
}
