"use client";

import { use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp, Construction } from "lucide-react";

const MOCK_EVENTS = [
  { id: "e1", title: "Halving de Bitcoin", date: "2028-04-01", type: "network", impact: "alto" },
  { id: "e2", title: "Vencimiento de opciones CME", date: "2026-06-28", type: "mercado", impact: "medio" },
  { id: "e3", title: "FOMC Meeting Fed", date: "2026-06-17", type: "macro", impact: "alto" },
  { id: "e4", title: "Upgrade red Ethereum (Prague)", date: "2026-07-15", type: "network", impact: "medio" },
];

const MOCK_CORRELATIONS = [
  { asset: "ETH", correlation: 0.88, color: "bg-emerald-500" },
  { asset: "BNB", correlation: 0.72, color: "bg-emerald-500" },
  { asset: "Nasdaq", correlation: 0.54, color: "bg-yellow-500" },
  { asset: "Oro", correlation: 0.31, color: "bg-yellow-500" },
  { asset: "DXY", correlation: -0.45, color: "bg-red-500" },
];

export default function ContextPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: paramSymbol } = use(params);
  const symbol = paramSymbol.toUpperCase();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Construction className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-bold">Contexto · {symbol}</h2>
        <span className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-500">
          Mock — F4+
        </span>
      </div>

      {/* Upcoming events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Eventos próximos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {MOCK_EVENTS.map((ev) => (
            <div key={ev.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="text-sm font-medium">{ev.title}</p>
                <p className="text-xs text-muted-foreground">{ev.date} · {ev.type}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium border ${ev.impact === "alto" ? "text-red-500 border-red-500/30 bg-red-500/10" : "text-yellow-500 border-yellow-500/30 bg-yellow-500/10"}`}>
                {ev.impact}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Correlations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Correlaciones del precio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {MOCK_CORRELATIONS.map((corr) => (
            <div key={corr.asset} className="flex items-center gap-4">
              <span className="w-16 text-sm font-medium">{corr.asset}</span>
              <div className="flex-1 rounded-full bg-muted h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${corr.correlation >= 0 ? "bg-emerald-500/70" : "bg-red-500/70"}`}
                  style={{ width: `${Math.abs(corr.correlation) * 100}%`, marginLeft: corr.correlation < 0 ? "auto" : undefined }}
                />
              </div>
              <span className={`w-12 text-right text-sm tabular-nums font-semibold ${corr.correlation >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {corr.correlation > 0 ? "+" : ""}{corr.correlation.toFixed(2)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
