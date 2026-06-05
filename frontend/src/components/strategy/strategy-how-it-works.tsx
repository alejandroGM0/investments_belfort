"use client";

import { useState } from "react";
import {
  Sparkles,
  FlaskConical,
  FolderOpen,
  CircleHelp,
  Clock,
  History,
  GitCompare,
  CheckCircle2,
  XCircle,
  ArrowDown,
  LineChart,
  Shield,
  TrendingUp,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const BLOCKS = [
  {
    id: "setup",
    icon: Sparkles,
    label: "Ahora",
    title: "Setup recomendado",
    tint: "violet",
    question: "¿Opero hoy?",
    does: "Precio actual + tendencia + SL/TP con ATR.",
    not: "No predice ganancias ni gana el backtest.",
  },
  {
    id: "ranking",
    icon: FlaskConical,
    label: "Pasado",
    title: "Ranking e historial",
    tint: "blue",
    question: "¿Qué señal aguantó mejor?",
    does: "Simula ~80 patrones (Engulfing, MACD…) y guarda todos los combos.",
    not: "No es «compra ya»; puede no haber señal ahora.",
  },
  {
    id: "mine",
    icon: FolderOpen,
    label: "Tú",
    title: "Mis estrategias",
    tint: "emerald",
    question: "¿Qué sigo?",
    does: "Marcadores para el gráfico (setup o patrón guardado).",
    not: "Belfort no ejecuta trades automáticamente.",
  },
] as const;

const STEPS = [
  {
    icon: Sparkles,
    title: "Setup violeta",
    desc: "¿Tiene sentido plantear operación hoy o paso?",
  },
  {
    icon: LineChart,
    title: "Gráfico y Técnico",
    desc: "¿Veo el patrón o niveles en el precio real?",
  },
  {
    icon: History,
    title: "Ranking + Historial",
    desc: "¿Qué combo SL/TP rindió mejor en datos viejos?",
  },
  {
    icon: GitCompare,
    title: "Cruce",
    desc: "¿Coinciden dirección de hoy, gráfico y patrón top?",
  },
  {
    icon: Zap,
    title: "Decisión",
    desc: "Operar, esperar o solo vigilar — siempre manual.",
  },
] as const;

const METRICS = [
  {
    name: "Win rate",
    short: "WR",
    hint: "Ideal con 50+ trades",
    good: "≥ 50%",
    explain: "Porcentaje de operaciones ganadoras en la simulación.",
  },
  {
    name: "Profit factor",
    short: "PF",
    hint: "> 1 = ganó en conjunto",
    good: "≥ 1.5",
    explain: "Ganancia total dividida entre pérdida total.",
  },
  {
    name: "Sharpe",
    short: "SR",
    hint: "Riesgo vs rentabilidad",
    good: "≥ 1.0",
    explain: "Cuanto más alto, más estable fue el retorno histórico simulado.",
  },
  {
    name: "Retorno total",
    short: "Ret.",
    hint: "Curva de equity",
    good: "> 0%",
    explain: "Subida o bajada acumulada desde el inicio de la curva (base 1).",
  },
  {
    name: "Drawdown",
    short: "DD",
    hint: "Peor racha",
    good: "Menor es mejor",
    explain: "Mayor caída desde un pico de la curva — aguante psicológico.",
  },
  {
    name: "Expectancy",
    short: "Exp.",
    hint: "Por trade",
    good: "> 0%",
    explain: "Lo que esperas ganar o perder de media en cada operación.",
  },
] as const;

const MISTAKES = [
  {
    title: "«El #1 del ranking es mi estrategia definitiva»",
    fix: "Es la mejor señal del catálogo en este activo y timeframe — no una verdad universal.",
  },
  {
    title: "«El setup debería salir en el backtest»",
    fix: "El backtest necesita reglas repetibles (patrones). El setup es solo una foto de hoy.",
  },
  {
    title: "«Sharpe alto = entrar ya»",
    fix: "Mide el pasado. Puede no haber señal en la vela actual.",
  },
  {
    title: "«Alcista arriba y patrón bajista en ranking = bug»",
    fix: "Son dos preguntas distintas (ahora vs histórico). Tú priorizas.",
  },
] as const;

const TINT_STYLES = {
  violet: {
    card: "border-violet-500/25 bg-gradient-to-br from-violet-500/12 to-transparent",
    icon: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    badge: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  },
  blue: {
    card: "border-blue-500/25 bg-gradient-to-br from-blue-500/12 to-transparent",
    icon: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  },
  emerald: {
    card: "border-emerald-500/25 bg-gradient-to-br from-emerald-500/12 to-transparent",
    icon: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
} as const;

function TintCard({ block }: { block: (typeof BLOCKS)[number] }) {
  const Icon = block.icon;
  const s = TINT_STYLES[block.tint];
  return (
    <article className={cn("rounded-2xl border p-4", s.card)}>
      <div className="flex items-start justify-between gap-2">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", s.icon)}>
          <Icon className="h-4 w-4" />
        </div>
        <Badge variant="outline" className={cn("text-[10px] font-semibold border-0", s.badge)}>
          {block.label}
        </Badge>
      </div>
      <h3 className="mt-3 text-sm font-semibold">{block.title}</h3>
      <p className="mt-1 text-xs font-medium text-foreground/90">{block.question}</p>
      <div className="mt-3 space-y-2">
        <p className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
          {block.does}
        </p>
        <p className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500/90" />
          {block.not}
        </p>
      </div>
    </article>
  );
}

function QuickOverview() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3.5">
        <p className="text-sm leading-relaxed text-foreground">
          <span className="font-semibold">En una frase:</span> el panel violeta responde si tiene
          sentido operar <span className="text-primary font-medium">hoy</span>; el ranking e
          historial dicen qué señal fue menos mala en el{" "}
          <span className="text-primary font-medium">pasado</span>. Tú cruzas ambos antes de decidir.
        </p>
      </div>

      <div className="rounded-2xl border bg-card/60 p-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Flujo mental
        </p>
        <div className="flex flex-col items-stretch gap-0 sm:flex-row sm:items-center sm:justify-between">
          {[
            { label: "Setup", sub: "ahora", color: "bg-violet-500" },
            { label: "Gráfico", sub: "confirmar", color: "bg-slate-500" },
            { label: "Cruce", sub: "¿encaja?", color: "bg-primary" },
            { label: "Tú", sub: "decides", color: "bg-emerald-500" },
          ].map((node, i, arr) => (
            <div key={node.label} className="flex flex-col items-center sm:flex-1">
              <div className="flex w-full items-center sm:flex-col">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm",
                    node.color
                  )}
                >
                  {i + 1}
                </div>
                {i < arr.length - 1 && (
                  <div className="mx-2 hidden h-px flex-1 bg-border sm:block" />
                )}
                {i < arr.length - 1 && (
                  <ArrowDown className="my-1 h-4 w-4 text-muted-foreground/40 sm:hidden" />
                )}
              </div>
              <p className="mt-2 text-xs font-semibold">{node.label}</p>
              <p className="text-[10px] text-muted-foreground">{node.sub}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
          <History className="h-3.5 w-3.5 shrink-0" />
          El tab <strong className="text-foreground">Historial</strong> lista todos los combos del grid,
          no solo el #1.
        </p>
      </div>

      <div className="grid gap-3">
        {BLOCKS.map((b) => (
          <TintCard key={b.id} block={b} />
        ))}
      </div>

      <div className="flex gap-3 rounded-2xl border border-dashed p-4">
        <div className="flex-1 rounded-xl bg-violet-500/10 px-3 py-2 text-center">
          <Clock className="mx-auto h-4 w-4 text-violet-500" />
          <p className="mt-1 text-[10px] font-bold uppercase text-violet-600 dark:text-violet-400">
            Ahora
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Setup recomendado</p>
        </div>
        <div className="flex items-center text-muted-foreground/40">≠</div>
        <div className="flex-1 rounded-xl bg-blue-500/10 px-3 py-2 text-center">
          <History className="mx-auto h-4 w-4 text-blue-500" />
          <p className="mt-1 text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">
            Pasado
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Ranking + historial</p>
        </div>
      </div>
    </div>
  );
}

function StepGuide() {
  return (
    <div className="space-y-1 pb-2">
      <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
        Sigue este orden la primera vez que entres a la página. Después te será automático.
      </p>
      <ol className="relative space-y-0">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const last = i === STEPS.length - 1;
          return (
            <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
              {!last && (
                <span
                  className="absolute left-[19px] top-10 bottom-0 w-px bg-border"
                  aria-hidden
                />
              )}
              <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-background bg-primary/10 shadow-sm">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground">PASO {i + 1}</span>
                </div>
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <div>
          <p className="text-sm font-semibold text-foreground">La clave: el cruce</p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Belfort no fusiona setup y ranking por ti. Si hoy es alcista pero el mejor histórico es
            un patrón de reversión bajista, para y decide qué pesa más.
          </p>
        </div>
      </div>
    </div>
  );
}

function MetricsGuide() {
  return (
    <div className="space-y-4 pb-2">
      <p className="text-sm text-muted-foreground leading-relaxed">
        En <strong className="text-foreground">Resumen</strong> ves las del patrón elegido. En{" "}
        <strong className="text-foreground">Historial</strong> comparas todos los combos guardados.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {METRICS.map((m) => (
          <div
            key={m.name}
            className="rounded-xl border bg-card/50 p-3.5 transition-colors hover:bg-muted/30"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{m.name}</span>
              <Badge variant="secondary" className="font-mono text-[10px]">
                {m.short}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{m.explain}</p>
            <p className="mt-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              Referencia: {m.good} · {m.hint}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MistakesGuide() {
  return (
    <div className="space-y-3 pb-2">
      {MISTAKES.map((m) => (
        <div
          key={m.title}
          className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-4"
        >
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-foreground leading-snug">{m.title}</p>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{m.fix}</p>
            </div>
          </div>
        </div>
      ))}
      <div className="rounded-2xl border p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Shield className="h-4 w-4 text-primary" />
          ¿Por qué Engulfing, MACD…?
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Un mismo <strong className="text-foreground">motor de riesgo</strong> (SL×ATR, R:R, filtros)
          se prueba con cada patrón del catálogo. El grid guarda miles de combos; el ranking ordena el
          mejor por patrón.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {["Motor v1", "× patrón", "Grid SL/TP", "Ranking"].map((t) => (
            <span
              key={t}
              className="rounded-md border bg-background px-2 py-1 text-[10px] font-medium"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StrategyHowItWorks() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5",
          "px-2.5 py-0.5 text-xs font-medium text-primary",
          "hover:bg-primary/10 hover:border-primary/40 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        <CircleHelp className="h-3.5 w-3.5" />
        Guía
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        >
          <SheetHeader className="shrink-0 space-y-0 border-b px-5 pt-6 pb-4 text-left">
            <SheetTitle className="text-lg font-semibold tracking-tight pr-8">
              Cómo usar Estrategia
            </SheetTitle>
            <SheetDescription className="text-sm leading-relaxed">
              Tres fuentes de información que no compiten — las cruzas tú.
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b px-5 py-3">
              <TabsList className="w-full grid grid-cols-4 h-9">
                <TabsTrigger value="overview" className="text-[11px] px-1">
                  Resumen
                </TabsTrigger>
                <TabsTrigger value="steps" className="text-[11px] px-1">
                  Pasos
                </TabsTrigger>
                <TabsTrigger value="metrics" className="text-[11px] px-1">
                  Métricas
                </TabsTrigger>
                <TabsTrigger value="mistakes" className="text-[11px] px-1">
                  Errores
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
                <QuickOverview />
              </TabsContent>
              <TabsContent value="steps" className="mt-0 focus-visible:outline-none">
                <StepGuide />
              </TabsContent>
              <TabsContent value="metrics" className="mt-0 focus-visible:outline-none">
                <MetricsGuide />
              </TabsContent>
              <TabsContent value="mistakes" className="mt-0 focus-visible:outline-none">
                <MistakesGuide />
              </TabsContent>
            </div>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}
