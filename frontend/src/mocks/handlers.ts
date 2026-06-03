import { http, HttpResponse, passthrough } from "msw";
import { env } from "@/lib/env";
import ohlcvBtc from "./fixtures/ohlcv_btc.json";
import analysisBtc from "./fixtures/analysis_btc.json";
import sentimentBtc from "./fixtures/sentiment_btc.json";
import newsBtc from "./fixtures/news_btc.json";
import backtestBtc from "./fixtures/backtest_btc.json";
import rankingData from "./fixtures/ranking.json";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export const handlers = [
  http.get(`${BASE}/ohlcv/:symbol`, ({ params }) => {
    const symbol = params.symbol as string;
    const data = symbol.toUpperCase() === "BTC" ? ohlcvBtc : {
      ...ohlcvBtc,
      symbol: symbol.toUpperCase(),
    };
    return HttpResponse.json(data);
  }),

  http.get(`${BASE}/analysis/:symbol`, ({ params }) => {
    const symbol = params.symbol as string;
    const data = symbol.toUpperCase() === "BTC" ? analysisBtc : {
      ...analysisBtc,
      symbol: symbol.toUpperCase(),
      summary: {
        ...analysisBtc.summary,
        confluence_score: Math.floor(50 + Math.random() * 40),
        trend: ["bullish", "bearish", "neutral"][Math.floor(Math.random() * 3)] as string,
      },
    };
    return HttpResponse.json(data);
  }),

  http.get(`${BASE}/analysis/:symbol/chart-markers`, () => {
    return HttpResponse.json([
      { time: 1748909400, position: "belowBar", shape: "arrowUp", color: "#22c55e", text: "Eng", pattern_id: "eng_1" },
      { time: 1748894400, position: "aboveBar", shape: "circle", color: "#3b82f6", text: "BOS", pattern_id: "bos_1" },
    ]);
  }),

  http.get(`${BASE}/sentiment/:symbol`, ({ params }) => {
    if (env.sentimentReal) {
      return passthrough();
    }
    const symbol = params.symbol as string;
    const data = symbol.toUpperCase() === "BTC" ? sentimentBtc : {
      ...sentimentBtc,
      symbol: symbol.toUpperCase(),
      score: Math.floor(-60 + Math.random() * 120),
    };
    return HttpResponse.json(data);
  }),

  http.get(`${BASE}/news/:symbol`, ({ params }) => {
    if (env.newsReal) {
      return passthrough();
    }
    const symbol = params.symbol as string;
    const data = symbol.toUpperCase() === "BTC" ? newsBtc : {
      ...newsBtc,
      symbol: symbol.toUpperCase(),
    };
    return HttpResponse.json(data);
  }),

  http.get(`${BASE}/backtest/:symbol`, ({ params }) => {
    const symbol = params.symbol as string;
    const data = symbol.toUpperCase() === "BTC" ? backtestBtc : {
      ...backtestBtc,
      symbol: symbol.toUpperCase(),
    };
    return HttpResponse.json(data);
  }),

  http.get(`${BASE}/ranking`, () => {
    return HttpResponse.json(rankingData);
  }),

  http.get(`${BASE}/dashboard/:symbol`, ({ params }) => {
    const symbol = params.symbol as string;
    return HttpResponse.json({
      symbol: symbol.toUpperCase(),
      tf: "4h",
      combined_score: 68,
      technical: analysisBtc.summary,
      sentiment: sentimentBtc,
      news: newsBtc,
      backtest: backtestBtc,
      disclaimer: "Basado en backtest histórico. No constituye asesoramiento financiero.",
      updated_at: new Date().toISOString(),
    });
  }),
];
