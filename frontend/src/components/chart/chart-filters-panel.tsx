"use client";

import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import {
  PATTERN_CATEGORY_OPTIONS,
  PATTERN_STATUS_OPTIONS,
  type ChartDisplayFilters,
  type PatternCategory,
} from "@/lib/chart-filters";

interface ChartFiltersPanelProps {
  filters: ChartDisplayFilters;
  onChange: (f: Partial<ChartDisplayFilters>) => void;
  onReset: () => void;
  onToggleCategory: (cat: PatternCategory) => void;
}

function RangeField({
  id,
  label,
  hint,
  min,
  max,
  step,
  value,
  format,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-xs">
          {label}
        </Label>
        <span className="font-mono text-xs text-muted-foreground">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer accent-primary"
      />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ChartFiltersPanel({
  filters,
  onChange,
  onReset,
  onToggleCategory,
}: ChartFiltersPanelProps) {
  return (
    <Accordion type="single" collapsible defaultValue="filters" className="w-full">
      <AccordionItem value="filters" className="border rounded-lg px-3">
        <AccordionTrigger className="py-3 text-sm hover:no-underline">
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filtros y umbrales del gráfico
          </span>
        </AccordionTrigger>
        <AccordionContent className="pb-4">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Patrones
              </p>
              <RangeField
                id="min-pattern-conf"
                label="Confianza mínima"
                min={0}
                max={100}
                step={5}
                value={Math.round(filters.minPatternConfidence * 100)}
                format={(v) => `${v}%`}
                onChange={(v) => onChange({ minPatternConfidence: v / 100 })}
              />
              <div className="space-y-1.5">
                <Label className="text-xs">Estado</Label>
                <Select
                  value={filters.patternStatus}
                  onValueChange={(v) =>
                    v && onChange({ patternStatus: v as ChartDisplayFilters["patternStatus"] })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PATTERN_STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Dirección</Label>
                <Select
                  value={filters.patternDirection}
                  onValueChange={(v) =>
                    v && onChange({ patternDirection: v as ChartDisplayFilters["patternDirection"] })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">Todas</SelectItem>
                    <SelectItem value="bull" className="text-xs">Alcistas</SelectItem>
                    <SelectItem value="bear" className="text-xs">Bajistas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <RangeField
                id="max-markers"
                label="Máx. señales en gráfico"
                min={10}
                max={200}
                step={10}
                value={filters.maxMarkers}
                format={(v) => String(v)}
                onChange={(v) => onChange({ maxMarkers: v })}
              />
              <div className="space-y-2">
                <Label className="text-xs">Categorías (vacío = todas)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {PATTERN_CATEGORY_OPTIONS.map((c) => {
                    const on = filters.patternCategories.includes(c.value);
                    return (
                      <Badge
                        key={c.value}
                        variant="outline"
                        className={cn(
                          "cursor-pointer text-[10px] font-normal",
                          on && "bg-primary/10 border-primary/50 text-primary"
                        )}
                        onClick={() => onToggleCategory(c.value)}
                      >
                        {c.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Soportes / resistencias
              </p>
              <RangeField
                id="min-level-strength"
                label="Fuerza mínima del nivel"
                min={0}
                max={100}
                step={5}
                value={Math.round(filters.minLevelStrength * 100)}
                format={(v) => `${v}%`}
                onChange={(v) => onChange({ minLevelStrength: v / 100 })}
                hint="Solo niveles con strength ≥ este umbral"
              />
              <RangeField
                id="max-levels"
                label="Top por lado (S y R)"
                min={1}
                max={15}
                step={1}
                value={filters.maxLevelsPerSide}
                format={(v) => `${v} S + ${v} R`}
                onChange={(v) => onChange({ maxLevelsPerSide: v })}
                hint="Los más fuertes tras filtrar por fuerza"
              />
            </div>

            <div className="space-y-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tendencia y proyección
              </p>
              <RangeField
                id="min-confluence"
                label="Confluencia mínima"
                min={0}
                max={100}
                step={5}
                value={filters.minConfluence}
                format={(v) => `${v}%`}
                onChange={(v) => onChange({ minConfluence: v })}
                hint="Por debajo: oculta proyección y setup en el gráfico"
              />
              <RangeField
                id="projection-bars"
                label="Velas proyectadas"
                min={4}
                max={48}
                step={2}
                value={filters.projectionBars}
                format={(v) => String(v)}
                onChange={(v) => onChange({ projectionBars: v })}
              />
              <div className="flex items-center gap-2">
                <Switch
                  id="show-setup"
                  checked={filters.showTradeSetup}
                  onCheckedChange={(v) => onChange({ showTradeSetup: v })}
                  className="scale-90"
                />
                <Label htmlFor="show-setup" className="text-xs cursor-pointer">
                  Mostrar líneas Entry / SL / TP
                </Label>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={onReset}>
              <RotateCcw className="mr-1 h-3 w-3" />
              Restaurar valores por defecto
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
