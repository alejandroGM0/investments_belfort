"use client";

import Link from "next/link";
import { Sparkles, LineChart, BookmarkPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TrendBadge } from "@/components/common/trend-badge";
import { fmtPrice } from "@/lib/utils";
import type { components } from "@/api/types";

type TradeSetup = components["schemas"]["TradeSetup"];

interface RecommendedSetupPanelProps {
  symbol: string;
  setup: TradeSetup | null | undefined;
  confluenceScore?: number;
  trend?: components["schemas"]["TrendDirection"];
  isActive: boolean;
  onApply: () => void;
  onSave: () => void;
}

export function RecommendedSetupPanel({
  symbol,
  setup,
  confluenceScore,
  trend,
  isActive,
  onApply,
  onSave,
}: RecommendedSetupPanelProps) {
  if (!setup?.entry) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <Sparkles className="h-8 w-8 text-muted-foreground/50" />
          <div>
            <p className="font-medium">Sin setup recomendado ahora</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              El análisis no propone operación (tendencia lateral o confluencia baja).
              Revisa la pestaña Técnico o espera a más señales.
            </p>
          </div>
          <Link
            href={`/asset/${symbol}/technical`}
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
          >
            Ver análisis técnico
          </Link>
        </CardContent>
      </Card>
    );
  }

  const dir = setup.direction ?? "neutral";

  return (
    <Card className="overflow-hidden border-violet-500/25 bg-gradient-to-br from-violet-500/5 via-transparent to-transparent">
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-medium text-violet-600 dark:text-violet-400">
                <Sparkles className="h-3.5 w-3.5" />
                Setup recomendado
              </span>
              {trend && <TrendBadge direction={trend} size="sm" />}
              {confluenceScore != null && (
                <span className="text-xs text-muted-foreground">
                  Confluencia {confluenceScore}%
                </span>
              )}
              {isActive && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                  <Check className="h-3 w-3" /> Activo en gráfico
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Operación sugerida <strong className="font-normal text-foreground">solo para este momento</strong>:
              precio actual + tendencia + SL 1,5×ATR / TP 3×ATR. El backtest no la prueba porque necesita
              una regla de <em>cuándo</em> entrar en cada vela histórica (un patrón), no una foto de hoy.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button size="sm" onClick={onApply} className="gap-1.5">
              <LineChart className="h-3.5 w-3.5" />
              Usar en gráfico
            </Button>
            <Button size="sm" variant="outline" onClick={onSave} className="gap-1.5">
              <BookmarkPlus className="h-3.5 w-3.5" />
              Guardar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x border-t border-violet-500/15 bg-card/40">
          <div className="px-4 py-4 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Entrada</p>
            <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
              {fmtPrice(setup.entry!)}
            </p>
          </div>
          <div className="px-4 py-4 text-center">
            <p className="text-[10px] uppercase tracking-wider text-red-500/80">Stop loss</p>
            <p className="mt-1 font-mono text-lg font-semibold text-red-500 tabular-nums">
              {setup.stop_loss != null ? fmtPrice(setup.stop_loss) : "—"}
            </p>
          </div>
          <div className="px-4 py-4 text-center">
            <p className="text-[10px] uppercase tracking-wider text-emerald-500/80">Take profit</p>
            <p className="mt-1 font-mono text-lg font-semibold text-emerald-500 tabular-nums">
              {setup.take_profit != null ? fmtPrice(setup.take_profit) : "—"}
            </p>
          </div>
        </div>
        {setup.risk_reward != null && (
          <p className="border-t border-violet-500/10 px-5 py-2 text-center text-xs text-muted-foreground">
            Riesgo / beneficio{" "}
            <span className="font-semibold text-foreground">{setup.risk_reward.toFixed(1)}:1</span>
            {dir !== "neutral" && (
              <> · operación {dir === "bullish" ? "alcista" : "bajista"}</>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
