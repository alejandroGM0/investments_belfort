"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";
import { useRanking } from "@/api/hooks/use-ranking";
import { toApiSymbol } from "@/lib/symbols";
import { TrendBadge } from "@/components/common/trend-badge";
import { ScoreBadge } from "@/components/common/score-badge";
import { SentimentChip } from "@/components/news/sentiment-chip";
import { LoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { ErrorState } from "@/components/feedback/error-state";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp, ArrowRight } from "lucide-react";
import { fmtPrice, fmtPct } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function MarketsPage() {
  const { timeframe, watchlist } = useAppStore();
  const { data, isLoading, isError, refetch } = useRanking(timeframe, watchlist.map(toApiSymbol));
  const [search, setSearch] = useState("");

  const filtered = data?.items.filter((item) =>
    item.symbol.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6" /> Ranking de Mercados
          </h1>
          <p className="text-sm text-muted-foreground">
            Ordenado por claridad de señal técnica · {timeframe} · precios en vivo cada ~5s
          </p>
        </div>
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar símbolo..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={8} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground w-8">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Símbolo</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Claridad</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Tendencia</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground hidden sm:table-cell">Patrones</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground hidden md:table-cell">Sentimiento</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground hidden lg:table-cell">Noticias</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Precio</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground hidden sm:table-cell">24h</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr key={item.symbol} className={cn("border-b last:border-0 hover:bg-muted/20 transition-colors", i % 2 === 0 ? "" : "bg-muted/5")}>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{item.rank}</td>
                  <td className="px-4 py-3">
                    <Link href={`/asset/${item.symbol}`} className="font-mono font-bold hover:text-primary transition-colors">
                      {item.symbol}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", item.confluence_score >= 70 ? "bg-emerald-500" : item.confluence_score >= 45 ? "bg-yellow-500" : "bg-red-500")}
                          style={{ width: `${item.confluence_score}%` }}
                        />
                      </div>
                      <ScoreBadge score={item.confluence_score} size="sm" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <TrendBadge direction={item.trend} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    <span className="text-muted-foreground">{item.active_patterns}</span>
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    {item.sentiment_score !== undefined && (
                      <span className={cn("font-semibold tabular-nums text-xs", (item.sentiment_score ?? 0) > 20 ? "text-emerald-500" : (item.sentiment_score ?? 0) < -20 ? "text-red-500" : "text-yellow-500")}>
                        {(item.sentiment_score ?? 0) > 0 ? "+" : ""}{item.sentiment_score}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell">
                    {item.news_tone && <SentimentChip tone={item.news_tone as "positive" | "negative" | "neutral" | "mixed"} />}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {item.price ? fmtPrice(item.price) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    {item.price_change_24h !== undefined && (
                      <span className={cn("text-xs tabular-nums", (item.price_change_24h ?? 0) >= 0 ? "text-emerald-500" : "text-red-500")}>
                        {fmtPct(item.price_change_24h ?? 0)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/asset/${item.symbol}`} className="text-muted-foreground hover:text-foreground transition-colors">
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
