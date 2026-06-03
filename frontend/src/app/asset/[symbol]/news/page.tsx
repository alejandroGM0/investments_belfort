"use client";

import { use, useState } from "react";
import { useNews } from "@/api/hooks/use-news";
import { NewsCard } from "@/components/news/news-card";
import { SentimentChip } from "@/components/news/sentiment-chip";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { ErrorState } from "@/components/feedback/error-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Newspaper } from "lucide-react";

type SentimentFilter = "positive" | "negative" | "neutral" | "all";

export default function NewsPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: paramSymbol } = use(params);
  const symbol = paramSymbol.toUpperCase();
  const [filter, setFilter] = useState<SentimentFilter>("all");
  const { data, isLoading, isError, refetch } = useNews(symbol, 20, filter);

  if (isLoading) return <div className="p-6"><LoadingSkeleton rows={8} /></div>;
  if (isError) return <div className="p-6"><ErrorState onRetry={refetch} /></div>;
  if (!data) return null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Newspaper className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-bold">Noticias · {symbol}</h2>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as SentimentFilter)}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="Filtrar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="positive">Positivas</SelectItem>
            <SelectItem value="negative">Negativas</SelectItem>
            <SelectItem value="neutral">Neutrales</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-4 rounded-xl border bg-muted/30 px-4 py-3 text-sm">
        <span>Hoy:</span>
        <span className="text-emerald-500 font-semibold">{data.summary.positive} positivas</span>
        <span className="text-red-500 font-semibold">{data.summary.negative} negativas</span>
        <span className="text-muted-foreground">{data.summary.neutral} neutrales</span>
        <SentimentChip tone={data.summary.overall_tone as "positive" | "negative" | "neutral" | "mixed"} />
      </div>

      {data.items.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="Sin noticias"
          message="No hay artículos para este filtro. Prueba otro tono o vuelve más tarde."
        />
      ) : (
        <div className="space-y-3">
          {data.items.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
