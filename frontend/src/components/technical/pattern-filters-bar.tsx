"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, Filter, Activity, EyeOff } from "lucide-react";

export interface PatternFilters {
  search: string;
  category: string;
  direction: string;
  onlyActive: boolean;
  hideInactive: boolean;
  minConfidence: number;
}

interface PatternFiltersBarProps {
  filters: PatternFilters;
  onChange: (f: PatternFilters) => void;
}

const CATEGORIES = [
  { value: "all", label: "Todas" },
  { value: "candles", label: "Velas" },
  { value: "chart_patterns", label: "Figuras" },
  { value: "trend", label: "Tendencia" },
  { value: "structure", label: "Estructura" },
  { value: "indicators", label: "Indicadores" },
  { value: "levels", label: "Niveles" },
];

const DIRECTIONS = [
  { value: "all", label: "Todas" },
  { value: "bull", label: "Alcistas" },
  { value: "bear", label: "Bajistas" },
  { value: "neutral", label: "Neutrales" },
];

export function PatternFiltersBar({ filters, onChange }: PatternFiltersBarProps) {
  function set<K extends keyof PatternFilters>(key: K, value: PatternFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="flex flex-col gap-4 bg-muted/20 p-5 rounded-2xl border border-border/40 shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          Filtros y Búsqueda de Patrones
        </h3>
      </div>
      
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
          <Input
            placeholder="Buscar patrón por nombre..."
            value={filters.search}
            onChange={(e) => set("search", e.target.value)}
            className="pl-10 h-11 bg-background border-border/60 transition-all hover:border-primary/40 focus-visible:border-primary/60 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-3">
          <Select value={filters.category} onValueChange={(v) => v && set("category", v)}>
            <SelectTrigger className="h-11 w-44 bg-background border-border/60 rounded-xl hover:border-primary/40 transition-colors">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value} className="cursor-pointer">{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.direction} onValueChange={(v) => v && set("direction", v)}>
            <SelectTrigger className="h-11 w-40 bg-background border-border/60 rounded-xl hover:border-primary/40 transition-colors">
              <SelectValue placeholder="Dirección" />
            </SelectTrigger>
            <SelectContent>
              {DIRECTIONS.map((d) => (
                <SelectItem key={d.value} value={d.value} className="cursor-pointer">{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-5 px-5 py-2.5 bg-background rounded-xl border border-border/60 h-11 shadow-sm">
          <div className="flex items-center gap-2.5">
            <Switch
              id="only-active"
              checked={filters.onlyActive}
              onCheckedChange={(v) => set("onlyActive", v)}
              className="data-[state=checked]:bg-emerald-500 shadow-sm"
            />
            <Label htmlFor="only-active" className="text-xs font-medium cursor-pointer flex items-center gap-1.5 text-foreground/80 hover:text-foreground transition-colors">
              <Activity className="h-3.5 w-3.5 text-emerald-500" />
              Solo activos
            </Label>
          </div>
          
          <div className="w-px h-5 bg-border/80"></div>
          
          <div className="flex items-center gap-2.5">
            <Switch
              id="hide-inactive"
              checked={filters.hideInactive}
              onCheckedChange={(v) => set("hideInactive", v)}
              className="shadow-sm"
            />
            <Label htmlFor="hide-inactive" className="text-xs font-medium cursor-pointer flex items-center gap-1.5 text-foreground/80 hover:text-foreground transition-colors">
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              Ocultar inactivos
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}
