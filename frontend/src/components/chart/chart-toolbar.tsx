"use client";

import {
  CandlestickChart,
  Minus,
  TrendingUp,
  LineChart,
  Target,
  SlidersHorizontal,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface ChartOverlays {
  patterns: boolean;
  levels: boolean;
  ema: boolean;
  projection: boolean;
  setup: boolean;
}

interface OverlayDef {
  key: keyof ChartOverlays;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tip: string;
}

const OVERLAYS: OverlayDef[] = [
  {
    key: "patterns",
    label: "Patrones",
    icon: CandlestickChart,
    tip: "Marcadores de patrones técnicos en el histórico",
  },
  {
    key: "levels",
    label: "S/R",
    icon: Minus,
    tip: "Soportes y resistencias filtrados por fuerza",
  },
  {
    key: "ema",
    label: "EMA",
    icon: LineChart,
    tip: "Medias exponenciales (20 y 50)",
  },
  {
    key: "projection",
    label: "Proyección",
    icon: TrendingUp,
    tip: "Trayectoria estimada hacia el objetivo",
  },
  {
    key: "setup",
    label: "Setup",
    icon: Target,
    tip: "Líneas Entry / Stop Loss / Take Profit",
  },
];

interface ChartToolbarProps {
  overlays: ChartOverlays;
  onOverlayChange: (key: keyof ChartOverlays) => void;
  onOpenFilters: () => void;
  activeFilterCount?: number;
}

export function ChartToolbar({
  overlays,
  onOverlayChange,
  onOpenFilters,
  activeFilterCount = 0,
}: ChartToolbarProps) {
  return (
    <TooltipProvider delay={600}>
      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {OVERLAYS.map((o) => {
          const Icon = o.icon;
          const active = overlays[o.key];
          return (
            <Tooltip key={o.key}>
              <TooltipTrigger
                onClick={() => onOverlayChange(o.key)}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-all select-none",
                  active
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60",
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-colors",
                    active
                      ? o.key === "projection"
                        ? "text-violet-500"
                        : o.key === "setup"
                          ? "text-amber-500"
                          : o.key === "levels"
                            ? "text-emerald-500"
                            : o.key === "patterns"
                              ? "text-sky-500"
                              : "text-blue-500"
                      : "",
                  )}
                />
                <span className="hidden sm:inline">{o.label}</span>
              </TooltipTrigger>
              <TooltipContent side="bottom">{o.tip}</TooltipContent>
            </Tooltip>
          );
        })}

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Tooltip>
          <TooltipTrigger
            onClick={onOpenFilters}
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "relative transition-colors",
              activeFilterCount > 0 && "text-primary",
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground leading-none">
                {activeFilterCount}
              </span>
            )}
          </TooltipTrigger>
          <TooltipContent side="bottom">Filtros y umbrales</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
