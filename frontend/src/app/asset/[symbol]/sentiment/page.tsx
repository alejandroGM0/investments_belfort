"use client";

import { use, useState } from "react";
import { useSentiment } from "@/api/hooks/use-sentiment";
import { SentimentGauge } from "@/components/sentiment/sentiment-gauge";
import { LoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { ErrorState } from "@/components/feedback/error-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Users } from "lucide-react";
import { fmtNumber, timeAgo, cn } from "@/lib/utils";
import { env, SENTIMENT_WINDOWS, type SentimentWindow } from "@/lib/env";

const WINDOW_LABELS: Record<SentimentWindow, string> = {
  "1h": "1h",
  "4h": "4h",
  "24h": "24h",
  "7d": "7d",
};

export default function SentimentPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: paramSymbol } = use(params);
  const symbol = paramSymbol.toUpperCase();
  const [window, setWindow] = useState<SentimentWindow>("24h");
  const { data, isLoading, isError, refetch } = useSentiment(symbol, window);

  if (isLoading) return <div className="p-6"><LoadingSkeleton rows={6} /></div>;
  if (isError) return <div className="p-6"><ErrorState onRetry={refetch} /></div>;
  if (!data) return null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-bold">Sentimiento Social · {symbol}</h2>
          {env.sentimentReal ? (
            <Badge variant="outline" className="text-emerald-500 border-emerald-500/40">Datos en vivo</Badge>
          ) : (
            <Badge variant="outline" className="text-yellow-500 border-yellow-500/40">Mock</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Ventana:</span>
          <div className="flex items-center rounded-md border bg-muted/40 p-0.5">
            {SENTIMENT_WINDOWS.map((w) => (
              <button
                key={w}
                onClick={() => setWindow(w)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-all",
                  window === w
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {WINDOW_LABELS[w]}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mt-4">Actualizado {timeAgo(data.updated_at)}</p>

      <Card>
        <CardHeader><CardTitle className="text-base">Score global de sentimiento</CardTitle></CardHeader>
        <CardContent>
          <SentimentGauge score={data.score} />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Menciones 24h</p>
            <p className="text-3xl font-bold tabular-nums">{fmtNumber(data.mentions_24h)}</p>
            {data.mentions_7d != null && (
              <p className="text-xs text-muted-foreground">{fmtNumber(data.mentions_7d)} en 7 días</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tono general</p>
            <p className="text-3xl font-bold capitalize">
              {data.tone === "positive"
                ? "Positivo"
                : data.tone === "negative"
                ? "Negativo"
                : data.tone === "mixed"
                ? "Mixto"
                : "Neutral"}
            </p>
          </CardContent>
        </Card>
      </div>

      {data.networks && data.networks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Por fuente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.networks.map((net) => (
              <div key={net.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{net.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{fmtNumber(net.mentions)} menciones</span>
                    <span
                      className={`font-semibold tabular-nums ${net.score > 20 ? "text-emerald-500" : net.score < -20 ? "text-red-500" : "text-yellow-500"}`}
                    >
                      {net.score > 0 ? "+" : ""}
                      {net.score}
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${net.score > 20 ? "bg-emerald-500" : net.score < -20 ? "bg-red-500" : "bg-yellow-500"}`}
                    style={{ width: `${((net.score + 100) / 200) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {data.history && data.history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolución del sentimiento ({window})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-20">
              {[...data.history].reverse().map((point, i) => {
                const h = ((point.score + 100) / 200) * 100;
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-sm transition-all ${point.score > 20 ? "bg-emerald-500/70" : point.score < -20 ? "bg-red-500/70" : "bg-yellow-500/70"}`}
                      style={{ height: `${Math.max(h, 5)}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
