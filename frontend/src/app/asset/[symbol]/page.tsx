"use client";

import { use } from "react";
import { useAppStore } from "@/stores/app-store";
import { useAnalysis } from "@/api/hooks/use-analysis";
import { useSentiment } from "@/api/hooks/use-sentiment";
import { useNews } from "@/api/hooks/use-news";
import { useOhlcv } from "@/api/hooks/use-ohlcv";
import { ConfluenceScore } from "@/components/summary/confluence-score";
import { TopSignalsList } from "@/components/summary/top-signals-list";
import { MetricCard } from "@/components/summary/metric-card";
import { TrendBadge } from "@/components/common/trend-badge";
import { DisclaimerBanner } from "@/components/feedback/disclaimer-banner";
import { CardSkeleton, LoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { PriceChart } from "@/components/chart/price-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, BarChart2, MessageCircle, Newspaper, Target } from "lucide-react";
import { fmtPrice, fmtPct } from "@/lib/utils";

export default function AssetSummaryPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: paramSymbol } = use(params);
  const symbol = paramSymbol.toUpperCase();
  const { timeframe } = useAppStore();
  const { data: analysis, isLoading: loadA } = useAnalysis(symbol, timeframe);
  const { data: sentiment, isLoading: loadS } = useSentiment(symbol);
  const { data: news, isLoading: loadN } = useNews(symbol, 3);
  const { data: ohlcv } = useOhlcv(symbol, timeframe, 60);

  const last = ohlcv?.candles.at(-1);
  const prev = ohlcv?.candles.at(-2);
  const change = last && prev ? ((last.close - prev.close) / prev.close) * 100 : null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold">{symbol}</h2>
        {analysis && <TrendBadge direction={analysis.summary.trend} />}
        {last && (
          <span className="font-mono text-lg font-semibold">{fmtPrice(last.close)}</span>
        )}
        {change !== null && (
          <span className={change >= 0 ? "text-emerald-500 text-sm" : "text-red-500 text-sm"}>
            {fmtPct(change)}
          </span>
        )}
      </div>

      {/* Mini chart */}
      {ohlcv && (
        <Card>
          <CardContent className="p-2">
            <PriceChart candles={ohlcv.candles} height={220} />
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {!loadA && analysis ? (
          <MetricCard
            title="Confluencia"
            value={analysis.summary.confluence_score}
            subtitle="Score técnico"
            icon={BarChart2}
            trend={analysis.summary.trend === "bullish" ? "up" : analysis.summary.trend === "bearish" ? "down" : "neutral"}
          />
        ) : <CardSkeleton />}

        {last ? (
          <MetricCard title="Precio" value={fmtPrice(last.close)} subtitle={change !== null ? fmtPct(change) : ""} icon={DollarSign} />
        ) : <CardSkeleton />}

        {!loadS && sentiment ? (
          <MetricCard title="Sentimiento" value={`${sentiment.score > 0 ? "+" : ""}${sentiment.score}`} subtitle={`${sentiment.mentions_24h.toLocaleString()} menciones`} icon={MessageCircle} trend={sentiment.score > 20 ? "up" : sentiment.score < -20 ? "down" : "neutral"} />
        ) : <CardSkeleton />}

        {!loadN && news ? (
          <MetricCard title="Noticias" value={news.summary.overall_tone === "positive" ? "Positivo" : news.summary.overall_tone === "negative" ? "Negativo" : "Mixto"} subtitle={`${news.summary.positive} pos · ${news.summary.negative} neg`} icon={Newspaper} />
        ) : <CardSkeleton />}
      </div>

      {/* Confluence + Top signals */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Score técnico</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {!loadA && analysis ? (
              <>
                <ConfluenceScore score={analysis.summary.confluence_score} size="lg" />
                {analysis.summary.trade_setup && (
                  <div className="w-full space-y-2 rounded-lg border bg-muted/30 p-4 text-sm">
                    <p className="font-medium flex items-center gap-2"><Target className="h-4 w-4" /> Setup operativo</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Entrada</p>
                        <p className="font-mono font-semibold">{fmtPrice(analysis.summary.trade_setup.entry!)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Stop Loss</p>
                        <p className="font-mono font-semibold text-red-500">{fmtPrice(analysis.summary.trade_setup.stop_loss!)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Take Profit</p>
                        <p className="font-mono font-semibold text-emerald-500">{fmtPrice(analysis.summary.trade_setup.take_profit!)}</p>
                      </div>
                    </div>
                    <p className="text-center text-xs text-muted-foreground">R:R {analysis.summary.trade_setup.risk_reward?.toFixed(1)}:1</p>
                  </div>
                )}
              </>
            ) : <LoadingSkeleton rows={3} />}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Señales destacadas</CardTitle></CardHeader>
          <CardContent>
            {!loadA && analysis ? (
              <TopSignalsList patterns={analysis.summary.highlights} symbol={symbol} />
            ) : <LoadingSkeleton rows={5} />}
          </CardContent>
        </Card>
      </div>

      {/* Multi-TF */}
      {analysis?.summary.timeframe_analysis && (
        <Card>
          <CardHeader><CardTitle className="text-base">Tendencia multi-timeframe</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(analysis.summary.timeframe_analysis).map(([tf, info]) => (
                <div key={tf} className="flex items-center gap-3 rounded-lg border px-4 py-3">
                  <span className="font-mono text-sm font-bold text-muted-foreground">{tf}</span>
                  <TrendBadge direction={info.trend as "bullish" | "bearish" | "neutral"} />
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
