"use client";

import {
  Plus,
  Pencil,
  Trash2,
  Check,
  LineChart,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { fmtPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { CustomStrategy } from "@/lib/custom-strategies";

interface CustomStrategiesListProps {
  strategies: CustomStrategy[];
  symbol: string;
  activeId: string | null;
  onCreate: () => void;
  onEdit: (s: CustomStrategy) => void;
  onDelete: (id: string) => void;
  onActivate: (id: string) => void;
  onViewChart: () => void;
}

export function CustomStrategiesList({
  strategies,
  symbol,
  activeId,
  onCreate,
  onEdit,
  onDelete,
  onActivate,
  onViewChart,
}: CustomStrategiesListProps) {
  const forSymbol = strategies.filter(
    (s) => !s.symbol || s.symbol === symbol
  );

  if (forSymbol.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
        <Layers className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="font-medium">Aún no tienes estrategias propias</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Crea una manualmente o guarda el setup recomendado del análisis.
        </p>
        <Button className="mt-4 gap-1.5" size="sm" onClick={onCreate}>
          <Plus className="h-4 w-4" />
          Nueva estrategia
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {forSymbol.length} estrategia{forSymbol.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={onCreate}>
          <Plus className="h-3.5 w-3.5" />
          Nueva
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {forSymbol.map((s) => {
          const active = s.id === activeId;
          return (
            <Card
              key={s.id}
              className={cn(
                "transition-colors",
                active && "ring-2 ring-primary/40 border-primary/30"
              )}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{s.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-[10px]">
                        {s.kind === "setup" ? "Setup" : "Backtest"}
                      </Badge>
                      {active && (
                        <Badge className="text-[10px] bg-primary/15 text-primary border-0">
                          <Check className="mr-0.5 h-2.5 w-2.5" />
                          Activa
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEdit(s)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onDelete(s.id)}
                      aria-label="Eliminar"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {s.kind === "setup" && s.entry != null ? (
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-md bg-muted/50 px-1 py-1.5">
                      <p className="text-muted-foreground">Entry</p>
                      <p className="font-mono font-medium">{fmtPrice(s.entry)}</p>
                    </div>
                    <div className="rounded-md bg-red-500/5 px-1 py-1.5">
                      <p className="text-red-500/80">SL</p>
                      <p className="font-mono font-medium text-red-500">
                        {s.stop_loss != null ? fmtPrice(s.stop_loss) : "—"}
                      </p>
                    </div>
                    <div className="rounded-md bg-emerald-500/5 px-1 py-1.5">
                      <p className="text-emerald-500/80">TP</p>
                      <p className="font-mono font-medium text-emerald-500">
                        {s.take_profit != null ? fmtPrice(s.take_profit) : "—"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground font-mono">
                    SL {s.params?.sl_atr}×ATR · R:R {s.params?.tp_rr}
                    {s.pattern_name && <> · {s.pattern_name}</>}
                  </p>
                )}

                <div className="flex gap-2">
                  {!active && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1 text-xs h-7"
                      onClick={() => onActivate(s.id)}
                    >
                      Activar
                    </Button>
                  )}
                  {active && s.kind === "setup" && s.entry != null && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1 text-xs h-7 gap-1"
                      onClick={onViewChart}
                    >
                      <LineChart className="h-3 w-3" />
                      Ver gráfico
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
