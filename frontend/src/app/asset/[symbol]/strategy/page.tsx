"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { useCustomStrategiesStore } from "@/stores/custom-strategies-store";
import { useAnalysis } from "@/api/hooks/use-analysis";
import { useBacktest } from "@/api/hooks/use-backtest";
import { RecommendedSetupPanel } from "@/components/strategy/recommended-setup-panel";
import { CustomStrategiesList } from "@/components/strategy/custom-strategies-list";
import {
  CustomStrategyDialog,
  formValuesToStrategyDraft,
  type StrategyFormValues,
} from "@/components/strategy/custom-strategy-dialog";
import { BacktestPanel } from "@/components/strategy/backtest-panel";
import { StrategyHowItWorks } from "@/components/strategy/strategy-how-it-works";
import { DisclaimerBanner } from "@/components/feedback/disclaimer-banner";
import { LoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { ErrorState } from "@/components/feedback/error-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { api } from "@/api/client";
import { toApiSymbol } from "@/lib/symbols";
import { extractJobId } from "@/lib/job-id";
import { useQueryClient } from "@tanstack/react-query";
import type { CustomStrategy } from "@/lib/custom-strategies";
import { Target, FlaskConical, FolderOpen } from "lucide-react";

export default function StrategyPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: paramSymbol } = use(params);
  const symbol = paramSymbol.toUpperCase();
  const apiSymbol = toApiSymbol(symbol);
  const router = useRouter();
  const { timeframe } = useAppStore();

  const {
    data: analysis,
    isLoading: loadAnalysis,
    isError: analysisError,
    refetch: refetchAnalysis,
  } = useAnalysis(symbol, timeframe);
  const {
    data: backtest,
    isLoading: loadBacktest,
    isError: backtestError,
    refetch: refetchBacktest,
  } = useBacktest(symbol, timeframe);
  const queryClient = useQueryClient();

  const {
    strategies,
    activeStrategyId,
    addStrategy,
    updateStrategy,
    removeStrategy,
    setActiveStrategy,
    addFromRecommendedSetup,
    addFromBacktest,
  } = useCustomStrategiesStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomStrategy | null>(null);
  const [manualJobId, setManualJobId] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [runMode, setRunMode] = useState<"quick" | "full">("quick");
  const [selectedPatternId, setSelectedPatternId] = useState("");

  const recommendedSetup = analysis?.summary.trade_setup;
  const activeStrategy = strategies.find((s) => s.id === activeStrategyId) ?? null;
  const setupIsActive =
    activeStrategy != null &&
    activeStrategy.kind === "setup" &&
    (!activeStrategy.symbol || activeStrategy.symbol === symbol);

  useEffect(() => {
    const pid = backtest?.selection?.pattern_id ?? backtest?.top_patterns?.[0]?.selection?.pattern_id;
    if (pid) setSelectedPatternId((prev) => prev || pid);
  }, [backtest?.selection?.pattern_id, backtest?.top_patterns]);

  function handleApplyRecommended() {
    if (recommendedSetup?.entry == null) {
      toast.error("No hay setup recomendado disponible");
      return;
    }
    addFromRecommendedSetup(recommendedSetup, symbol, true);
    toast.success("Setup activo — abriendo gráfico");
    router.push(`/asset/${symbol}/chart`);
  }

  function handleSaveRecommended() {
    if (recommendedSetup?.entry == null) {
      toast.error("No hay setup recomendado disponible");
      return;
    }
    addFromRecommendedSetup(recommendedSetup, symbol, true);
    toast.success("Guardado en mis estrategias");
  }

  function handleFormSubmit(values: StrategyFormValues) {
    const draft = formValuesToStrategyDraft(values, symbol);
    if (draft.kind === "setup" && draft.entry == null) {
      toast.error("Indica al menos el precio de entrada");
      return;
    }
    if (editing) {
      updateStrategy(editing.id, draft);
      toast.success("Estrategia actualizada");
    } else {
      const id = addStrategy(draft);
      setActiveStrategy(id);
      toast.success("Estrategia creada y activada");
    }
    setEditing(null);
  }

  async function launchGrid() {
    setLaunching(true);
    try {
      const { data: resp, error } = await api.POST("/backtest/{symbol}/refresh", {
        params: { path: { symbol: apiSymbol }, query: { tf: timeframe, mode: runMode } },
      });
      if (error) {
        toast.error("No se pudo lanzar el backtest");
        return;
      }
      const jobId = extractJobId(resp);
      if (jobId) {
        setManualJobId(jobId);
        queryClient.invalidateQueries({ queryKey: ["backtest", apiSymbol, timeframe] });
        toast.info("Backtest en cola — verás el progreso abajo");
      } else {
        toast.error("El servidor no devolvió id de job");
      }
    } catch {
      toast.error("Error de red al lanzar backtest");
    } finally {
      setLaunching(false);
    }
  }

  const initialLoad = loadAnalysis && loadBacktest && !analysis && !backtest;

  if (initialLoad) {
    return (
      <div className="p-6">
        <LoadingSkeleton rows={8} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Target className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold tracking-tight">Estrategia</h1>
          <Badge variant="outline">{symbol}</Badge>
          <Badge variant="secondary">{timeframe}</Badge>
          <span className="hidden sm:inline text-muted-foreground/40">·</span>
          <StrategyHowItWorks />
        </div>
        <p className="text-sm text-muted-foreground">
          Setup de hoy · ranking histórico · estrategias guardadas.
        </p>
      </div>

      {analysisError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <ErrorState onRetry={refetchAnalysis} />
        </div>
      ) : loadAnalysis ? (
        <LoadingSkeleton rows={2} />
      ) : (
        <RecommendedSetupPanel
          symbol={symbol}
          setup={recommendedSetup}
          confluenceScore={analysis?.summary.confluence_score}
          trend={analysis?.summary.trend}
          isActive={setupIsActive && activeStrategy?.name === "Setup recomendado"}
          onApply={handleApplyRecommended}
          onSave={handleSaveRecommended}
        />
      )}

      <Tabs defaultValue="mine" className="w-full">
        <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
          <TabsTrigger value="mine" className="gap-1.5">
            <FolderOpen className="h-3.5 w-3.5" />
            Mis estrategias
          </TabsTrigger>
          <TabsTrigger value="backtest" className="gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" />
            Ranking por patrón
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="mt-4">
          <CustomStrategiesList
            strategies={strategies}
            symbol={symbol}
            activeId={activeStrategyId}
            onCreate={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            onEdit={(s) => {
              setEditing(s);
              setDialogOpen(true);
            }}
            onDelete={(id) => {
              removeStrategy(id);
              toast.success("Estrategia eliminada");
            }}
            onActivate={(id) => {
              const s = strategies.find((st) => st.id === id);
              if (s?.kind === "backtest") {
                toast.message("Estrategia de backtest activada", {
                  description: "Los presets de patrón no dibujan líneas en el gráfico; usa una de tipo Setup.",
                });
              } else {
                toast.success("Estrategia activa en el gráfico");
              }
              setActiveStrategy(id);
            }}
            onViewChart={() => router.push(`/asset/${symbol}/chart`)}
          />
        </TabsContent>

        <TabsContent value="backtest" className="mt-4">
          {backtestError ? (
            <ErrorState onRetry={refetchBacktest} />
          ) : loadBacktest ? (
            <LoadingSkeleton rows={4} />
          ) : backtest ? (
            <BacktestPanel
              symbol={symbol}
              data={backtest}
              timeframe={timeframe}
              selectedPatternId={selectedPatternId}
              onPatternChange={setSelectedPatternId}
              runMode={runMode}
              onRunModeChange={setRunMode}
              onLaunch={launchGrid}
              launching={launching}
              activeJobId={manualJobId ?? backtest.active_job?.id ?? null}
              onJobComplete={() => {
                queryClient.invalidateQueries({ queryKey: ["backtest", apiSymbol, timeframe] });
                queryClient.invalidateQueries({ queryKey: ["backtest-runs", apiSymbol, timeframe] });
                setManualJobId(null);
                toast.success("Backtest completado");
              }}
              onSavePattern={(selection) => {
                addFromBacktest(selection, symbol, false);
                toast.success("Patrón guardado en mis estrategias");
              }}
            />
          ) : null}
        </TabsContent>
      </Tabs>

      <CustomStrategyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSubmit={handleFormSubmit}
      />

      <DisclaimerBanner message="Los setups y backtests son orientativos. Resultados pasados no garantizan rendimiento futuro." />
    </div>
  );
}
