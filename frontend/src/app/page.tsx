"use client";

import Link from "next/link";
import { DollarSign, BarChart2, MessageCircle, Newspaper, Target, ArrowRight } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useAnalysis } from "@/api/hooks/use-analysis";
import { useSentiment } from "@/api/hooks/use-sentiment";
import { useNews } from "@/api/hooks/use-news";
import { useOhlcv } from "@/api/hooks/use-ohlcv";
import { MetricCard } from "@/components/summary/metric-card";
import { ConfluenceScore } from "@/components/summary/confluence-score";
import { TopSignalsList } from "@/components/summary/top-signals-list";
import { TrendBadge } from "@/components/common/trend-badge";
import { DisclaimerBanner } from "@/components/feedback/disclaimer-banner";
import { CardSkeleton, LoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { fmtPrice, fmtPct } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { symbol, timeframe } = useAppStore();
  const { data: analysis, isLoading: loadingAnalysis } = useAnalysis(symbol, timeframe);
  const { data: sentiment, isLoading: loadingSentiment } = useSentiment(symbol);
  const { data: news, isLoading: loadingNews } = useNews(symbol, 5);
  const { data: ohlcv } = useOhlcv(symbol, timeframe, 2);

  const lastCandle = ohlcv?.candles.at(-1);
  const prevCandle = ohlcv?.candles.at(-2);
  const priceChange = lastCandle && prevCandle ? ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100 : null;

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6 p-6">
      {/* Hero */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Análisis en tiempo real · {symbol} / {timeframe}
          </p>
        </div>
        <Link href={`/asset/${symbol}`} className={buttonVariants({ variant: "default" })}>
          Ver análisis completo <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {lastCandle ? (
          <MetricCard
            title="Precio actual"
            value={fmtPrice(lastCandle.close)}
            subtitle={priceChange !== null ? fmtPct(priceChange) + " vs anterior" : undefined}
            icon={DollarSign}
            trend={priceChange !== null ? (priceChange > 0 ? "up" : "down") : "neutral"}
          />
        ) : (
          <CardSkeleton />
        )}

        {!loadingAnalysis && analysis ? (
          <MetricCard
            title="Score de confluencia"
            value={<span className="flex items-center gap-2">{analysis.summary.confluence_score} <TrendBadge direction={analysis.summary.trend} size="sm" /></span>}
            subtitle={`${analysis.summary.trend_strength ?? "—"}% fuerza de tendencia`}
            icon={BarChart2}
            trend={analysis.summary.trend === "bullish" ? "up" : analysis.summary.trend === "bearish" ? "down" : "neutral"}
          />
        ) : (
          <CardSkeleton />
        )}

        {!loadingSentiment && sentiment ? (
          <MetricCard
            title="Sentimiento social"
            value={`${sentiment.score > 0 ? "+" : ""}${sentiment.score}`}
            subtitle={`${sentiment.mentions_24h.toLocaleString()} menciones 24h`}
            icon={MessageCircle}
            trend={sentiment.score > 20 ? "up" : sentiment.score < -20 ? "down" : "neutral"}
          />
        ) : (
          <CardSkeleton />
        )}

        {!loadingNews && news ? (
          <MetricCard
            title="Tono noticias"
            value={
              <span className="capitalize">
                {news.summary.overall_tone === "positive"
                  ? "Positivo"
                  : news.summary.overall_tone === "negative"
                  ? "Negativo"
                  : news.summary.overall_tone === "mixed"
                  ? "Mixto"
                  : "Neutral"}
              </span>
            }
            subtitle={`${news.summary.positive} pos · ${news.summary.negative} neg`}
            icon={Newspaper}
            trend={news.summary.overall_tone === "positive" ? "up" : news.summary.overall_tone === "negative" ? "down" : "neutral"}
          />
        ) : (
          <CardSkeleton />
        )}
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Confluence + trade setup */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Confluencia técnica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!loadingAnalysis && analysis ? (
              <>
                <div className="flex justify-center">
                  <ConfluenceScore score={analysis.summary.confluence_score} size="lg" />
                </div>
                {analysis.summary.trade_setup && (
                  <div className="space-y-2 rounded-lg border bg-muted/30 p-4 text-sm">
                    <p className="font-medium flex items-center gap-2">
                      <Target className="h-4 w-4" /> Setup sugerido
                    </p>
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
                    <p className="text-center text-xs text-muted-foreground">
                      R:R {analysis.summary.trade_setup.risk_reward?.toFixed(1)}:1
                    </p>
                  </div>
                )}
              </>
            ) : (
              <CardSkeleton />
            )}
          </CardContent>
        </Card>

        {/* Top signals */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Señales principales</CardTitle>
          </CardHeader>
          <CardContent>
            {!loadingAnalysis && analysis ? (
              <TopSignalsList patterns={analysis.summary.highlights} symbol={symbol} />
            ) : (
              <LoadingSkeleton rows={5} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Multi-TF summary */}
      {analysis?.summary.timeframe_analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tendencia multi-timeframe</CardTitle>
          </CardHeader>
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
