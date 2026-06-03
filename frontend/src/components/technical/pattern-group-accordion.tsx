"use client";

import { useState } from "react";
import { ChevronDown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { components } from "@/api/types";

type PatternGroup = any;
type PatternItem = any;

const categoryLabels: Record<string, string> = {
  candles: "Velas japonesas",
  chart_patterns: "Figuras chartistas",
  trend: "Tendencia",
  structure: "Estructura de mercado",
  indicators: "Indicadores",
  levels: "Niveles S/R",
};

const dirIcons = {
  bull: <TrendingUp className="h-3 w-3 text-emerald-500" />,
  bear: <TrendingDown className="h-3 w-3 text-red-500" />,
  neutral: <Minus className="h-3 w-3 text-muted-foreground" />,
};

const statusConfig = {
  active: { label: "activo", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  recent: { label: "reciente", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  inactive: { label: "inactivo", className: "bg-muted text-muted-foreground border-transparent" },
} as const;

function BarsSinceLabel({ bars_since }: { bars_since?: number | null }) {
  if (bars_since == null) return <span className="text-xs text-muted-foreground">nunca</span>;
  if (bars_since === 0) return null;
  return <span className="text-xs text-muted-foreground shrink-0">{bars_since}v atrás</span>;
}

function PatternRow({ pattern }: { pattern: PatternItem }) {
  const status = (pattern.status ?? (pattern.active ? "active" : "inactive")) as "active" | "recent" | "inactive";
  const cfg = statusConfig[status] ?? statusConfig.inactive;
  const isInactive = status === "inactive";

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-300",
        isInactive 
          ? "opacity-50 hover:opacity-100 grayscale hover:grayscale-0" 
          : "bg-background/50 border border-border/40 shadow-sm hover:shadow-md hover:border-primary/30 hover:bg-background"
      )}
    >
      <div className={cn("p-2 rounded-full transition-colors", !isInactive ? "bg-muted group-hover:bg-primary/10" : "")}>
        {dirIcons[pattern.direction as keyof typeof dirIcons] ?? dirIcons.neutral}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium transition-colors group-hover:text-primary", isInactive && "text-muted-foreground font-normal")}>{pattern.name}</p>
        {pattern.description && !isInactive && (
          <p className="truncate text-[11px] text-muted-foreground mt-0.5">{pattern.description}</p>
        )}
      </div>
      {!isInactive && (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="flex flex-col items-end justify-center gap-1.5 shrink-0 px-2 cursor-help group/conf hover:bg-muted/50 p-1.5 rounded-lg transition-colors">
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold tabular-nums">
                  {Math.round(pattern.confidence * 100)}%
                </span>
                <Info className="h-3 w-3 text-muted-foreground opacity-50 group-hover/conf:opacity-100 transition-opacity" />
              </div>
              <div className="h-1 w-10 rounded-full bg-muted overflow-hidden">
                <div 
                  className={cn("h-full rounded-full transition-all duration-500", pattern.confidence > 0.7 ? "bg-emerald-500" : pattern.confidence > 0.4 ? "bg-amber-500" : "bg-red-500")} 
                  style={{ width: `${Math.max(10, pattern.confidence * 100)}%` }} 
                />
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" className="w-64 p-3">
            <div className="space-y-2">
              <h4 className="font-semibold text-xs">Confianza del Patrón</h4>
              <p className="text-[11px] text-muted-foreground">
                Este porcentaje ({Math.round(pattern.confidence * 100)}%) indica la fiabilidad de la señal.
              </p>
              <div className="text-[11px] space-y-1 mt-2">
                <p>Se calcula en base a:</p>
                <ul className="list-disc pl-4 text-muted-foreground">
                  <li><strong>Contexto (40%):</strong> Alineación con la tendencia mayor y proximidad a niveles clave de Soporte/Resistencia.</li>
                  <li><strong>Historial (60%):</strong> Win Rate del patrón en backtests históricos (si está disponible).</li>
                </ul>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
      <div className="flex flex-col items-end justify-center gap-1.5 shrink-0 ml-1">
        <Badge
          variant="outline"
          className={cn("text-[9px] uppercase tracking-wider px-1.5 py-0 h-4 border font-semibold", cfg.className)}
        >
          {cfg.label}
        </Badge>
        <BarsSinceLabel bars_since={status !== "active" ? pattern.bars_since : null} />
      </div>
    </div>
  );
}

interface PatternGroupAccordionProps {
  groups: PatternGroup[];
  showInactive?: boolean;
}

export function PatternGroupAccordion({ groups, showInactive = true }: PatternGroupAccordionProps) {
  // Default: open groups that have at least one active/recent signal
  const defaultOpen = new Set(
    groups
      .filter((g) => (g.active_count ?? 0) + (g.recent_count ?? 0) > 0)
      .map((g) => g.category),
  );
  // Always open candles by default
  defaultOpen.add("candles");

  const [openGroups, setOpenGroups] = useState<Set<string>>(defaultOpen);

  function toggleGroup(cat: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {groups.map((group) => {
        const isOpen = openGroups.has(group.category);
        const activeCount = group.active_count ?? group.items.filter((p: any) => p.status === "active").length;
        const recentCount = group.recent_count ?? group.items.filter((p: any) => p.status === "recent").length;
        const visibleItems = showInactive
          ? group.items
          : group.items.filter((p: any) => p.status !== "inactive");

        return (
          <div key={group.category} className={cn("rounded-2xl border overflow-hidden transition-all duration-300", isOpen ? "shadow-md border-primary/20" : "shadow-sm hover:border-primary/10")}>
            <button
              className={cn(
                "flex w-full items-center justify-between px-5 py-4 transition-all duration-300",
                isOpen ? "bg-muted/40" : "bg-card hover:bg-muted/20"
              )}
              onClick={() => toggleGroup(group.category)}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span className={cn("font-semibold text-sm transition-colors", isOpen ? "text-primary" : "text-foreground")}>{categoryLabels[group.category] ?? group.category}</span>
                <div className="flex gap-1.5 items-center">
                  {/* Total count */}
                  <Badge variant="secondary" className="text-[10px] px-1.5 h-5 font-mono">{group.count}</Badge>
                  {/* Active count */}
                  {activeCount > 0 && (
                    <Badge variant="outline" className="text-[10px] px-2 h-5 text-emerald-600 border-emerald-500/30 bg-emerald-500/10 shadow-sm font-semibold uppercase tracking-wider">
                      {activeCount} activo{activeCount !== 1 ? "s" : ""}
                    </Badge>
                  )}
                  {recentCount > 0 && (
                    <Badge variant="outline" className="text-[10px] px-2 h-5 text-amber-600 border-amber-500/30 bg-amber-500/10 shadow-sm font-semibold uppercase tracking-wider">
                      {recentCount} reciente{recentCount !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              </div>
              <div className={cn("p-1 rounded-full transition-colors", isOpen ? "bg-primary/10" : "bg-muted group-hover:bg-muted/80")}>
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform duration-300 shrink-0", isOpen ? "rotate-180 text-primary" : "text-muted-foreground")}
                />
              </div>
            </button>

            <div
              className={cn(
                "grid transition-all duration-300 ease-in-out",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <div className="border-t border-border/50 bg-muted/10 px-2.5 py-3 flex flex-col gap-1.5">
                  {visibleItems.length === 0 ? (
                    <div className="px-4 py-8 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <div className="p-3 rounded-full bg-muted/50 border border-border/50">
                        <Minus className="h-5 w-5 opacity-40" />
                      </div>
                      <p className="text-xs font-medium">
                        Ningún patrón activo o reciente.
                      </p>
                    </div>
                  ) : (
                    visibleItems.map((p: any) => <PatternRow key={p.id} pattern={p} />)
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
