"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

export interface PatternFilters {
  search: string;
  category: string;
  direction: string;
  onlyActive: boolean;
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
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-44">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar patrón..."
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      <Select value={filters.category} onValueChange={(v) => v && set("category", v)}>
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue placeholder="Categoría" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORIES.map((c) => (
            <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.direction} onValueChange={(v) => v && set("direction", v)}>
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue placeholder="Dirección" />
        </SelectTrigger>
        <SelectContent>
          {DIRECTIONS.map((d) => (
            <SelectItem key={d.value} value={d.value} className="text-xs">{d.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Switch
          id="only-active"
          checked={filters.onlyActive}
          onCheckedChange={(v) => set("onlyActive", v)}
          className="scale-90"
        />
        <Label htmlFor="only-active" className="text-xs cursor-pointer">Solo activos</Label>
      </div>
    </div>
  );
}
