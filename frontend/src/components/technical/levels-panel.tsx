"use client";

import { useState, useMemo } from "react";
import { cn, fmtPrice } from "@/lib/utils";
import type { components } from "@/api/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";

type Level = components["schemas"]["Level"];

interface LevelsPanelProps {
  levels: Level[];
}

function getStrengthLabel(strength: number) {
  if (strength >= 0.9) return "Muy Fuerte";
  if (strength >= 0.7) return "Fuerte";
  if (strength >= 0.5) return "Moderado";
  return "Débil";
}

function LevelRow({ lvl, isSupport }: { lvl: Level; isSupport: boolean }) {
  const colorClass = isSupport ? "bg-emerald-500" : "bg-red-500";
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b last:border-0 hover:bg-muted/30">
      <span className="font-mono font-semibold">{fmtPrice(lvl.price)}</span>
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-muted-foreground uppercase font-semibold w-20 text-right">
          {getStrengthLabel(lvl.strength)}
        </span>
        <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full", colorClass, lvl.strength < 0.5 && "opacity-40")}
            style={{ width: `${lvl.strength * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground w-8 text-right font-medium">
          {Math.round(lvl.strength * 100)}%
        </span>
      </div>
    </div>
  );
}

export function LevelsPanel({ levels }: LevelsPanelProps) {
  const [minStrength, setMinStrength] = useState<number>(0);

  const supports = useMemo(() => 
    levels.filter((l) => l.type === "support" && l.strength >= minStrength).sort((a, b) => b.strength - a.strength),
    [levels, minStrength]
  );
  
  const resistances = useMemo(() => 
    levels.filter((l) => l.type === "resistance" && l.strength >= minStrength).sort((a, b) => b.strength - a.strength),
    [levels, minStrength]
  );

  return (
    <div className="space-y-4">
      {/* FILTER BAR */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-muted/20 p-4 rounded-xl border border-border/40 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Filtros de Niveles
          </h3>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Fuerza mínima:</span>
          <Select value={minStrength.toString()} onValueChange={(v) => setMinStrength(Number(v))}>
            <SelectTrigger className="h-9 w-full sm:w-44 bg-background border-border/60 rounded-lg hover:border-primary/40 transition-colors">
              <SelectValue placeholder="Fuerza" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0" className="cursor-pointer">Todos (0%+)</SelectItem>
              <SelectItem value="0.5" className="cursor-pointer">Moderado (50%+)</SelectItem>
              <SelectItem value="0.7" className="cursor-pointer">Fuerte (70%+)</SelectItem>
              <SelectItem value="0.9" className="cursor-pointer">Muy Fuerte (90%+)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center text-[10px] text-muted-foreground uppercase font-semibold bg-muted/20 p-2 rounded-lg border border-border/50">
        <span className="text-foreground/70 mr-1">Leyenda:</span>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>Soporte</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div>Resistencia</div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="opacity-100">Muy Fuerte {'>'}90%</span>
          <span className="opacity-80">Fuerte {'>'}70%</span>
          <span className="opacity-60">Moderado {'>'}50%</span>
          <span className="opacity-40">Débil {'<'}50%</span>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Resistencias */}
        <div className="rounded-xl border overflow-hidden">
          <div className="bg-red-500/10 px-4 py-2 border-b">
            <h4 className="text-xs font-semibold text-red-500 uppercase tracking-wide">Resistencias</h4>
          </div>
          {resistances.map((lvl) => (
            <LevelRow key={lvl.price} lvl={lvl} isSupport={false} />
          ))}
        </div>

        {/* Soportes */}
        <div className="rounded-xl border overflow-hidden">
          <div className="bg-emerald-500/10 px-4 py-2 border-b">
            <h4 className="text-xs font-semibold text-emerald-500 uppercase tracking-wide">Soportes</h4>
          </div>
          {supports.map((lvl) => (
            <LevelRow key={lvl.price} lvl={lvl} isSupport={true} />
          ))}
        </div>
      </div>
    </div>
  );
}
