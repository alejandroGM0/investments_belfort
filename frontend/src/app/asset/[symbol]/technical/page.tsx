"use client";

import { use, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { useAnalysis } from "@/api/hooks/use-analysis";
import { PatternFiltersBar, type PatternFilters } from "@/components/technical/pattern-filters-bar";
import { PatternGroupAccordion } from "@/components/technical/pattern-group-accordion";
import { IndicatorCompactTable } from "@/components/technical/indicator-compact-table";
import { LevelsPanel } from "@/components/technical/levels-panel";
import { TradeSetupCard } from "@/components/technical/trade-setup-card";
import { ConfluenceScore } from "@/components/summary/confluence-score";
import { TrendBadge } from "@/components/common/trend-badge";
import { DisclaimerBanner } from "@/components/feedback/disclaimer-banner";
import { LoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { ErrorState } from "@/components/feedback/error-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DEFAULT_FILTERS: PatternFilters = {
  search: "",
  category: "all",
  direction: "all",
  onlyActive: false,
  minConfidence: 0,
};

export default function TechnicalPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: paramSymbol } = use(params);
  const symbol = paramSymbol.toUpperCase();
  const { timeframe } = useAppStore();
  const { data, isLoading, isError, refetch } = useAnalysis(symbol, timeframe);
  const [filters, setFilters] = useState<PatternFilters>(DEFAULT_FILTERS);

  if (isLoading) return <div className="p-6"><LoadingSkeleton rows={8} /></div>;
  if (isError) return <div className="p-6"><ErrorState onRetry={refetch} /></div>;
  if (!data) return null;

  const filteredGroups = data.groups
    .map((g) => ({
      ...g,
      items: g.items.filter((p) => {
        if (filters.onlyActive && !p.active) return false;
        if (filters.direction !== "all" && p.direction !== filters.direction) return false;
        if (filters.category !== "all" && g.category !== filters.category) return false;
        if (filters.search && !p.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (p.confidence < filters.minConfidence) return false;
        return true;
      }),
    }))
    .filter((g) => filters.category === "all" || g.category === filters.category)
    .filter((g) => g.items.length > 0 || filters.category === "all");

  const totalPatterns = data.groups.reduce((acc, g) => acc + g.count, 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">Análisis Técnico</h2>
          <TrendBadge direction={data.summary.trend} />
          <span className="text-xs text-muted-foreground">{totalPatterns} patrones detectados</span>
        </div>
        <ConfluenceScore score={data.summary.confluence_score} size="sm" />
      </div>

      {/* Trade setup */}
      {data.summary.trade_setup && <TradeSetupCard setup={data.summary.trade_setup} />}

      {/* Main tabs */}
      <Tabs defaultValue="patterns">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="patterns">Patrones</TabsTrigger>
          <TabsTrigger value="indicators">Indicadores</TabsTrigger>
          <TabsTrigger value="levels">Niveles</TabsTrigger>
        </TabsList>

        <TabsContent value="patterns" className="space-y-4 pt-4">
          <PatternFiltersBar filters={filters} onChange={setFilters} />
          {filteredGroups.length > 0 ? (
            <PatternGroupAccordion groups={filteredGroups} maxVisible={5} />
          ) : (
            <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
              No hay patrones con los filtros actuales.
            </div>
          )}
        </TabsContent>

        <TabsContent value="indicators" className="pt-4">
          <IndicatorCompactTable indicators={data.indicators} />
        </TabsContent>

        <TabsContent value="levels" className="pt-4">
          <LevelsPanel levels={data.levels} />
        </TabsContent>
      </Tabs>

      {/* Multi-TF tendencia */}
      {data.summary.timeframe_analysis && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Tendencia multi-timeframe</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(data.summary.timeframe_analysis).map(([tf, info]) => (
                <div key={tf} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                  <span className="font-mono text-xs font-bold text-muted-foreground">{tf}</span>
                  <TrendBadge direction={info.trend as "bullish" | "bearish" | "neutral"} size="sm" />
                  <span className="text-xs text-muted-foreground">{info.strength}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <DisclaimerBanner />
    </div>
  );
}
