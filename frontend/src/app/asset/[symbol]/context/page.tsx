"use client";

import { use } from "react";
import { useAppStore } from "@/stores/app-store";
import { useAssetContext } from "@/api/hooks/use-context";
import { LoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { ErrorState } from "@/components/feedback/error-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ContextPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: paramSymbol } = use(params);
  const symbol = paramSymbol.toUpperCase();
  const { timeframe } = useAppStore();
  const { data, isLoading, isError, refetch } = useAssetContext(symbol, timeframe);

  if (isLoading) return <div className="p-6"><LoadingSkeleton rows={6} /></div>;
  if (isError) return <div className="p-6"><ErrorState onRetry={refetch} /></div>;
  if (!data) return null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-bold">Contexto · {symbol}</h2>
        <span className="text-xs text-muted-foreground">{timeframe}</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Eventos próximos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.events.length === 0 ? (
            <EmptyState
              title="Sin eventos programados"
              message="No hay fuente de calendario configurada. Los eventos aparecerán cuando integres un proveedor (p. ej. CoinMarketCal o datos propios)."
            />
          ) : (
            <div className="space-y-3">
              {data.events.map((ev) => (
                <div key={ev.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">{ev.date} · {ev.type}</p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium border",
                      ev.impact === "alto"
                        ? "text-red-500 border-red-500/30 bg-red-500/10"
                        : "text-yellow-500 border-yellow-500/30 bg-yellow-500/10"
                    )}
                  >
                    {ev.impact}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Correlaciones de retornos (OHLCV en cache)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.correlations.length === 0 ? (
            <EmptyState
              title="Sin correlaciones"
              message="Descarga OHLCV de pares relacionados con: belfort data fetch ETHUSDT --tf 4h (y peers en BELFORT_CORRELATION_PEERS)."
            />
          ) : (
            <div className="space-y-3">
              {data.correlations.map((corr) => (
                <div key={corr.asset} className="flex items-center gap-4">
                  <span className="w-16 text-sm font-medium">{corr.asset}</span>
                  <div className="flex-1 rounded-full bg-muted h-2 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        corr.correlation >= 0 ? "bg-emerald-500/70" : "bg-red-500/70"
                      )}
                      style={{
                        width: `${Math.abs(corr.correlation) * 100}%`,
                        marginLeft: corr.correlation < 0 ? "auto" : undefined,
                      }}
                    />
                  </div>
                  <span
                    className={cn(
                      "w-12 text-right text-sm tabular-nums font-semibold",
                      corr.correlation >= 0 ? "text-emerald-500" : "text-red-500"
                    )}
                  >
                    {corr.correlation > 0 ? "+" : ""}
                    {corr.correlation.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
