"use client";

import { useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Info,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import type { components } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, fmtPrice } from "@/lib/utils";

type OperationalSetup = components["schemas"]["OperationalSetupResponse"];
type Evidence = components["schemas"]["OperationalEvidence"];

interface OperationalSetupPanelProps {
  setup?: OperationalSetup;
  isLoading?: boolean;
  isError?: boolean;
  compact?: boolean;
  className?: string;
}

function pct(value?: number | null, decimals = 0) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(decimals)}%`;
}

function pctRaw(value?: number | null, decimals = 2) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

function num(value?: number | null, decimals = 2) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(decimals);
}

function confidenceLabel(value?: "low" | "medium" | "high") {
  if (value === "high") return "Alta";
  if (value === "medium") return "Media";
  return "Baja";
}

function decisionStyles(decision?: OperationalSetup["decision"]) {
  if (decision === "strong_long" || decision === "long") {
    return {
      icon: TrendingUp,
      badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      ring: "ring-emerald-500/20",
    };
  }
  if (decision === "strong_short" || decision === "short") {
    return {
      icon: TrendingDown,
      badge: "bg-red-500/10 text-red-600 dark:text-red-400",
      ring: "ring-red-500/20",
    };
  }
  if (decision === "avoid") {
    return {
      icon: XCircle,
      badge: "bg-destructive/10 text-destructive",
      ring: "ring-destructive/20",
    };
  }
  return {
    icon: Clock3,
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    ring: "ring-amber-500/20",
  };
}

function impactIcon(impact: Evidence["impact"]) {
  if (impact === "positive") return CheckCircle2;
  if (impact === "negative") return AlertTriangle;
  return Info;
}

function impactClass(impact: Evidence["impact"]) {
  if (impact === "positive") return "text-emerald-600 dark:text-emerald-400";
  if (impact === "negative") return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

function Metric({
  label,
  value,
  hint,
  tone = "default",
  tooltipTitle,
  tooltipContent,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "bad" | "warn";
  tooltipTitle?: string;
  tooltipContent?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center justify-between">
        {label}
        {tooltipContent && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground/50 hover:text-foreground transition-colors cursor-help"
              >
                <Info className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              className="w-72 p-3 text-xs font-normal normal-case z-[100] tracking-normal"
            >
              {tooltipTitle && (
                <h4 className="font-semibold mb-1.5 text-sm text-foreground">
                  {tooltipTitle}
                </h4>
              )}
              <div className="text-muted-foreground space-y-2">
                {tooltipContent}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
      <div
        className={cn(
          "mt-1 font-mono text-lg font-semibold tabular-nums",
          tone === "good" && "text-emerald-600 dark:text-emerald-400",
          tone === "bad" && "text-red-600 dark:text-red-400",
          tone === "warn" && "text-amber-600 dark:text-amber-400",
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function LoadingPanel({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </CardContent>
    </Card>
  );
}

function clampLeverage(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(125, Math.max(1, value));
}

function approxLiquidationPrice(setup: OperationalSetup, leverage: number) {
  if (!setup.entry || setup.direction === "neutral" || leverage <= 1)
    return null;
  if (setup.direction === "bullish") return setup.entry * (1 - 1 / leverage);
  return setup.entry * (1 + 1 / leverage);
}

function LeveragePanel({
  setup,
  leverage,
  onLeverageChange,
  compact,
}: {
  setup: OperationalSetup;
  leverage: number;
  onLeverageChange: (value: number) => void;
  compact?: boolean;
}) {
  const riskOnMargin =
    setup.risk_pct != null ? setup.risk_pct * leverage : null;
  const rewardOnMargin =
    setup.reward_pct != null ? setup.reward_pct * leverage : null;
  const expectedOnMargin =
    setup.expectancy?.return_pct != null
      ? setup.expectancy.return_pct * leverage
      : null;
  const liquidation = approxLiquidationPrice(setup, leverage);
  const liquidationDistancePct = leverage > 1 ? 100 / leverage : null;
  const tooHot = (riskOnMargin ?? 0) >= 20;

  return (
    <section className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            Apalancamiento
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground/50 hover:text-foreground transition-colors cursor-help"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                className="w-80 p-3 text-xs font-normal normal-case z-[100] tracking-normal"
              >
                <h4 className="mb-1 text-sm font-semibold text-foreground">
                  Apalancamiento estimado
                </h4>
                <div className="space-y-2 text-muted-foreground">
                  <p>
                    Multiplica tu exposición sobre el margen usado. Si el setup
                    arriesga 1.5% de movimiento de precio y usas 5x, la pérdida
                    aproximada sobre margen al tocar SL sería 7.5%.
                  </p>
                  <p>
                    La liquidación es una aproximación simple sin mantenimiento,
                    funding, comisiones ni reglas específicas del exchange.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-xs text-muted-foreground">
            Ajusta cuánto quieres multiplicar tu exposición.
          </p>
        </div>
        <div className="flex w-24 items-center gap-1">
          <Input
            type="number"
            min={1}
            max={125}
            step={0.5}
            value={leverage}
            onChange={(e) =>
              onLeverageChange(clampLeverage(Number(e.target.value)))
            }
            className="h-8 text-right font-mono"
          />
          <span className="text-sm font-medium">x</span>
        </div>
      </div>

      <div
        className={cn("grid gap-2", compact ? "grid-cols-2" : "sm:grid-cols-4")}
      >
        <Metric
          label="Riesgo margen"
          value={riskOnMargin != null ? pctRaw(-riskOnMargin) : "—"}
          hint="Si toca SL"
          tone={tooHot ? "bad" : (riskOnMargin ?? 0) >= 10 ? "warn" : "default"}
        />
        <Metric
          label="Reward margen"
          value={rewardOnMargin != null ? pctRaw(rewardOnMargin) : "—"}
          hint="Si toca TP"
          tone="good"
        />
        <Metric
          label="Expect. margen"
          value={expectedOnMargin != null ? pctRaw(expectedOnMargin) : "—"}
          hint="Esperanza ajustada"
          tone={(expectedOnMargin ?? 0) > 0 ? "good" : "warn"}
        />
        <Metric
          label="Liq. aprox."
          value={liquidation != null ? fmtPrice(liquidation) : "—"}
          hint={
            liquidationDistancePct != null
              ? `~${liquidationDistancePct.toFixed(2)}% contra ti`
              : "Spot / 1x"
          }
          tone={leverage >= 10 ? "bad" : leverage >= 5 ? "warn" : "default"}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {[1, 2, 3, 5, 10, 20].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onLeverageChange(value)}
            className={cn(
              "rounded-md border px-2 py-1 text-xs font-medium transition-colors",
              leverage === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-muted",
            )}
          >
            {value}x
          </button>
        ))}
      </div>

      {tooHot && (
        <div className="mt-3 flex gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-2 text-xs text-red-600 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Riesgo elevado: el SL supondría perder aproximadamente{" "}
            {pctRaw(-riskOnMargin!)}
            del margen usado.
          </span>
        </div>
      )}
    </section>
  );
}

export function OperationalSetupPanel({
  setup,
  isLoading,
  isError,
  compact = false,
  className,
}: OperationalSetupPanelProps) {
  const [leverage, setLeverage] = useState(1);

  if (isLoading) return <LoadingPanel className={className} />;

  if (isError) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center gap-2 py-4 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          No se pudo cargar el setup operativo.
        </CardContent>
      </Card>
    );
  }

  if (!setup) return null;

  const styles = decisionStyles(setup.decision);
  const DecisionIcon = styles.icon;
  const win = setup.probability?.win;
  const ev = setup.expectancy?.r;
  const hasPrices =
    setup.entry != null && setup.stop_loss != null && setup.take_profit != null;

  if (compact) {
    return (
      <Card
        className={cn("border-border/80", styles.ring, className)}
        size="sm"
      >
        <CardHeader className="gap-2">
          <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
            <span>Setup operativo</span>
            <Badge className={styles.badge} variant="outline">
              <DecisionIcon className="h-3 w-3" />
              {setup.decision_label}
            </Badge>
          </CardTitle>
          <CardDescription>
            Score{" "}
            <span className="font-mono font-semibold text-foreground">
              {setup.decision_score}/100
            </span>
            {setup.probability && (
              <>
                {" · "}TP antes de SL{" "}
                <span className="font-mono font-semibold text-foreground">
                  {pct(setup.probability.win)}
                </span>
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Metric
              label="Entrada"
              value={hasPrices ? fmtPrice(setup.entry!) : "—"}
            />
            <Metric
              label="R/R"
              value={
                setup.risk_reward != null
                  ? `${num(setup.risk_reward, 2)}R`
                  : "—"
              }
              tone={(setup.risk_reward ?? 0) >= 1.8 ? "good" : "warn"}
              tooltipTitle="R/R (Risk/Reward)"
              tooltipContent="Relación Riesgo-Beneficio. Un valor de 2.0R significa que se busca ganar el doble de lo arriesgado."
            />
            <Metric
              label="SL"
              value={hasPrices ? fmtPrice(setup.stop_loss!) : "—"}
              hint={
                setup.risk_pct != null ? pctRaw(-setup.risk_pct) : undefined
              }
              tone="bad"
              tooltipTitle="Stop Loss"
              tooltipContent="Nivel donde se cierra la operación con pérdida máxima, ajustado a la volatilidad del mercado."
            />
            <Metric
              label="TP"
              value={hasPrices ? fmtPrice(setup.take_profit!) : "—"}
              hint={
                setup.reward_pct != null ? pctRaw(setup.reward_pct) : undefined
              }
              tone="good"
              tooltipTitle="Take Profit"
              tooltipContent="Objetivo de precio para asegurar las ganancias de forma automatizada."
            />
          </div>

          <LeveragePanel
            setup={setup}
            leverage={leverage}
            onLeverageChange={setLeverage}
            compact
          />

          {setup.expectancy && (
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Expectancy</span>
                <span
                  className={cn(
                    "font-mono font-semibold",
                    setup.expectancy.r > 0.15
                      ? "text-emerald-600 dark:text-emerald-400"
                      : setup.expectancy.r < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-amber-600 dark:text-amber-400",
                  )}
                >
                  {setup.expectancy.r >= 0 ? "+" : ""}
                  {num(setup.expectancy.r, 2)}R
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Retorno esperado {pctRaw(setup.expectancy.return_pct)}
              </div>
            </div>
          )}

          {setup.time_estimate && (
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
              <div className="mb-1 flex items-center gap-2 font-medium">
                <Clock3 className="h-3.5 w-3.5 text-violet-500" />
                Tiempo estimado
              </div>
              <div className="flex justify-between gap-3 text-xs">
                <span className="text-muted-foreground">TP</span>
                <span>{setup.time_estimate.tp_human}</span>
              </div>
              <div className="flex justify-between gap-3 text-xs">
                <span className="text-muted-foreground">Velas</span>
                <span className="font-mono">
                  {setup.time_estimate.tp_bars_min}-
                  {setup.time_estimate.tp_bars_max}
                </span>
              </div>
            </div>
          )}

          {setup.backtest_context && (
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs">
              <div className="font-medium">
                Backtest: {setup.backtest_context.pattern_name}
              </div>
              <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
                <span>Win rate</span>
                <span className="text-right font-mono text-foreground">
                  {pct(setup.backtest_context.win_rate, 1)}
                </span>
                <span>Trades</span>
                <span className="text-right font-mono text-foreground">
                  {setup.backtest_context.total_trades}
                </span>
                <span>PF</span>
                <span className="text-right font-mono text-foreground">
                  {num(setup.backtest_context.profit_factor, 2)}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {setup.evidence.slice(0, 3).map((item, index) => {
              const Icon = impactIcon(item.impact);
              return (
                <div
                  key={`${item.label}-${index}`}
                  className="flex gap-2 text-xs"
                >
                  <Icon
                    className={cn(
                      "mt-0.5 h-3.5 w-3.5 shrink-0",
                      impactClass(item.impact),
                    )}
                  />
                  <span>
                    {item.label}:{" "}
                    <span className="text-muted-foreground">{item.detail}</span>
                  </span>
                </div>
              );
            })}
          </div>

          {setup.warnings[0] && (
            <div className="flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{setup.warnings[0]}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-border/80", styles.ring, className)}>
      <CardHeader className="gap-3 md:grid-cols-[1fr_auto]">
        <div>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <span>Setup operativo</span>
            <Badge className={styles.badge} variant="outline">
              <DecisionIcon className="h-3 w-3" />
              {setup.decision_label}
            </Badge>
          </CardTitle>
          <CardDescription>
            Análisis operativo basado en confluencia técnica, backtest
            comparable y volatilidad actual.
          </CardDescription>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Score decisión
            </div>
            <div className="font-mono text-xl font-bold tabular-nums">
              {setup.decision_score}/100
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Entrada"
            value={hasPrices ? fmtPrice(setup.entry!) : "—"}
            hint={
              setup.direction === "bullish"
                ? "Sesgo long"
                : setup.direction === "bearish"
                  ? "Sesgo short"
                  : "Sin dirección"
            }
          />
          <Metric
            label="Stop Loss"
            value={hasPrices ? fmtPrice(setup.stop_loss!) : "—"}
            hint={
              setup.risk_pct != null
                ? `Riesgo ${pctRaw(-setup.risk_pct)}`
                : undefined
            }
            tone="bad"
            tooltipTitle="Stop Loss (Corte de pérdida)"
            tooltipContent={
              <>
                <p>
                  Nivel de precio en el que se cierra la operación
                  automáticamente para limitar las pérdidas.
                </p>
                <p>
                  Se calcula dinámicamente usando la volatilidad actual (ATR)
                  para evitar que fluctuaciones normales te saquen del mercado
                  antes de tiempo.
                </p>
              </>
            }
          />
          <Metric
            label="Take Profit"
            value={hasPrices ? fmtPrice(setup.take_profit!) : "—"}
            hint={
              setup.reward_pct != null
                ? `Objetivo ${pctRaw(setup.reward_pct)}`
                : undefined
            }
            tone="good"
            tooltipTitle="Take Profit (Toma de ganancias)"
            tooltipContent={
              <>
                <p>
                  Nivel de precio objetivo donde se cierra la operación con
                  beneficios asegurados.
                </p>
                <p>
                  Se suele colocar antes de resistencias o soportes importantes
                  donde el precio tiene más probabilidades de rebotar.
                </p>
              </>
            }
          />
          <Metric
            label="R/R"
            value={
              setup.risk_reward != null ? `${num(setup.risk_reward, 2)}R` : "—"
            }
            hint="Recompensa por cada 1R arriesgado"
            tone={(setup.risk_reward ?? 0) >= 1.8 ? "good" : "warn"}
            tooltipTitle="Relación Risk/Reward"
            tooltipContent={
              <p>
                Mide la recompensa potencial contra el riesgo asumido. Un valor
                de <strong>2.0R</strong> significa que por cada dólar que
                arriesgas perder en el Stop Loss, buscas ganar 2 dólares en el
                Take Profit.
              </p>
            }
          />
        </div>

        <LeveragePanel
          setup={setup}
          leverage={leverage}
          onLeverageChange={setLeverage}
        />

        <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr]">
          <section className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Target className="h-4 w-4 text-primary" />
              Probabilidades y expectativa
            </div>
            {setup.probability ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric
                  label="TP antes de SL"
                  value={pct(win)}
                  hint={`Rango ${pct(setup.probability.low)}–${pct(setup.probability.high)}`}
                  tone={
                    (win ?? 0) >= 0.56
                      ? "good"
                      : (win ?? 0) < 0.5
                        ? "bad"
                        : "warn"
                  }
                  tooltipTitle="Probabilidad de éxito (Win Rate)"
                  tooltipContent={
                    <p>
                      Estimación estadística de que el precio alcance el{" "}
                      <strong>Take Profit</strong> antes de tocar el{" "}
                      <strong>Stop Loss</strong>. Se basa en patrones técnicos
                      similares del pasado o en resultados de backtest
                      histórico.
                    </p>
                  }
                />
                <Metric
                  label="Expectancy"
                  value={`${ev != null && ev >= 0 ? "+" : ""}${num(ev, 2)}R`}
                  hint={
                    setup.expectancy
                      ? `${pctRaw(setup.expectancy.return_pct)} esperado sobre precio`
                      : undefined
                  }
                  tone={
                    (ev ?? 0) > 0.15 ? "good" : (ev ?? 0) < 0 ? "bad" : "warn"
                  }
                  tooltipTitle="Expectativa (Expectancy)"
                  tooltipContent={
                    <>
                      <p>
                        Mide cuánto esperas ganar en promedio por cada operación
                        de este tipo.
                      </p>
                      <p>
                        Se calcula multiplicando la probabilidad de ganar por la
                        ganancia esperada, y restando la probabilidad de perder
                        por la pérdida. Un valor positivo fuerte significa que a
                        la larga la estrategia es rentable.
                      </p>
                    </>
                  }
                />
                <Metric
                  label="Confianza estadística"
                  value={confidenceLabel(setup.probability.confidence)}
                  hint={`${setup.probability.sample_size} trades · ${setup.probability.source === "backtest_adjusted" ? "backtest" : "proxy técnico"}`}
                  tone={
                    setup.probability.confidence === "high"
                      ? "good"
                      : setup.probability.confidence === "low"
                        ? "warn"
                        : "default"
                  }
                  tooltipTitle="Confianza estadística"
                  tooltipContent={
                    <p>
                      Indica la fiabilidad de estas probabilidades basada en el
                      número de ejemplos pasados analizados (tamaño de la
                      muestra). Una confianza alta significa que hay muchísimos
                      casos similares previos validando los números.
                    </p>
                  }
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sin probabilidad operativa porque no hay setup direccional.
              </p>
            )}
          </section>

          <section className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Clock3 className="h-4 w-4 text-violet-500" />
              Tiempo estimado
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground/50 hover:text-foreground transition-colors cursor-help"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  className="w-72 p-3 text-xs font-normal normal-case z-[100] tracking-normal"
                >
                  <h4 className="font-semibold mb-1 text-sm text-foreground">
                    Tiempo estimado
                  </h4>
                  <p className="text-muted-foreground">
                    Proyección del tiempo (en velas) que podría tardar la
                    operación en alcanzar el Take Profit (TP) o Stop Loss (SL),
                    calculado a partir de la volatilidad reciente del activo (su
                    ATR actual).
                  </p>
                </PopoverContent>
              </Popover>
            </div>
            {setup.time_estimate ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">TP estimado</span>
                  <span className="font-medium">
                    {setup.time_estimate.tp_human}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Velas a TP</span>
                  <span className="font-mono">
                    {setup.time_estimate.tp_bars_min}-
                    {setup.time_estimate.tp_bars_max}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">SL medio</span>
                  <span className="font-medium">
                    {setup.time_estimate.sl_human}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">ATR</span>
                  <span className="font-mono">
                    {num(setup.time_estimate.atr_pct, 2)}%
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  TP {setup.time_estimate.tp_distance_atr} ATR · SL{" "}
                  {setup.time_estimate.sl_distance_atr} ATR
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sin estimación temporal disponible.
              </p>
            )}
          </section>

          <section className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Backtest comparable
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground/50 hover:text-foreground transition-colors cursor-help"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  className="w-72 p-3 text-xs font-normal normal-case z-[100] tracking-normal"
                >
                  <h4 className="font-semibold mb-1 text-sm text-foreground">
                    Backtest comparable
                  </h4>
                  <p className="text-muted-foreground">
                    Muestra los resultados reales que habría tenido una
                    estrategia histórica basada en el patrón técnico actual.
                    Esto valida estadísticamente si la señal técnica actual ha
                    funcionado bien en el pasado para este activo.
                  </p>
                </PopoverContent>
              </Popover>
            </div>
            {setup.backtest_context ? (
              <div className="space-y-2 text-sm">
                <div className="font-medium leading-tight">
                  {setup.backtest_context.pattern_name}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-muted-foreground">Win rate</span>
                  <span className="text-right font-mono">
                    {pct(setup.backtest_context.win_rate, 1)}
                  </span>
                  <span className="text-muted-foreground">Profit factor</span>
                  <span className="text-right font-mono">
                    {num(setup.backtest_context.profit_factor, 2)}
                  </span>
                  <span className="text-muted-foreground">Trades</span>
                  <span className="text-right font-mono">
                    {setup.backtest_context.total_trades}
                  </span>
                  <span className="text-muted-foreground">Sharpe</span>
                  <span className="text-right font-mono">
                    {num(setup.backtest_context.sharpe, 2)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sin backtest comparable todavía. La app usará proxy técnico
                hasta que existan resultados.
              </p>
            )}
          </section>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <section className="rounded-lg border border-border p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              Evidencia
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground/50 hover:text-foreground transition-colors cursor-help"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  className="w-72 p-3 text-xs font-normal normal-case z-[100] tracking-normal"
                >
                  <h4 className="font-semibold mb-1 text-sm text-foreground">
                    Evidencia operativa
                  </h4>
                  <p className="text-muted-foreground">
                    Lista de los factores técnicos actuales (tendencias, cruces
                    de medias móviles, niveles clave, osciladores) que apoyan o
                    contradicen la operación sugerida, valorando su impacto como
                    positivo, neutral o negativo.
                  </p>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              {setup.evidence.map((item, index) => {
                const Icon = impactIcon(item.impact);
                return (
                  <div
                    key={`${item.label}-${index}`}
                    className="flex gap-2 text-sm"
                  >
                    <Icon
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        impactClass(item.impact),
                      )}
                    />
                    <div>
                      <div className="font-medium leading-tight">
                        {item.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.detail}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-border p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              Riesgos / invalidación
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground/50 hover:text-foreground transition-colors cursor-help"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  className="w-72 p-3 text-xs font-normal normal-case z-[100] tracking-normal"
                >
                  <h4 className="font-semibold mb-1 text-sm text-foreground">
                    Riesgos e Invalidación
                  </h4>
                  <p className="text-muted-foreground">
                    Condiciones exactas bajo las cuales la operación perdería
                    todo el sentido (por ejemplo, si el precio cruza y consolida
                    en contra de un nivel de soporte maestro) y advertencias
                    sobre riesgo alto.
                  </p>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-3">
              {setup.warnings.length > 0 && (
                <div className="space-y-1">
                  {setup.warnings.map((warning, index) => (
                    <div
                      key={index}
                      className="flex gap-2 text-xs text-amber-600 dark:text-amber-400"
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-1">
                {setup.invalidation.map((item, index) => (
                  <div
                    key={index}
                    className="flex gap-2 text-xs text-muted-foreground"
                  >
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              Escenarios
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground/50 hover:text-foreground transition-colors cursor-help"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  className="w-72 p-3 text-xs font-normal normal-case z-[100] tracking-normal"
                >
                  <h4 className="font-semibold mb-1 text-sm text-foreground">
                    Escenarios de Gestión
                  </h4>
                  <p className="text-muted-foreground">
                    Planes de acción recomendados <strong>durante</strong> el
                    desarrollo de la operación. Indica acciones a tomar si
                    ocurren ciertos eventos (ej. mover el Stop Loss a cero
                    pérdidas o tomar ganancias parciales).
                  </p>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              {setup.scenarios.map((scenario) => (
                <div
                  key={scenario.name}
                  className="rounded-md bg-muted/30 p-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{scenario.name}</span>
                    {scenario.probability != null && (
                      <span className="font-mono text-muted-foreground">
                        {pct(scenario.probability)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    Trigger: {scenario.trigger}
                  </div>
                  <div className="mt-1">{scenario.action}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}
