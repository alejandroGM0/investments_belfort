"use client";

import { RotateCcw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  PATTERN_CATEGORY_OPTIONS,
  PATTERN_STATUS_OPTIONS,
  type ChartDisplayFilters,
  type ChartPatternDirectionFilter,
  type ChartPatternStatusFilter,
  type PatternCategory,
} from "@/lib/chart-filters";

interface ChartFiltersPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ChartDisplayFilters;
  onChange: (f: Partial<ChartDisplayFilters>) => void;
  onReset: () => void;
  onToggleCategory: (cat: PatternCategory) => void;
}

function FilterSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function SliderControl({
  id,
  label,
  value,
  min,
  max,
  step,
  display,
  infoTitle,
  infoDescription,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  infoTitle?: string;
  infoDescription?: React.ReactNode;
  onChange: (v: number) => void;
}) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
            {label}
          </Label>
          {infoTitle && (
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground transition-colors cursor-help">
                  <Info className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-72 p-3 z-[100]">
                <div className="space-y-2 text-xs font-normal text-foreground">
                  <h4 className="font-semibold text-sm">{infoTitle}</h4>
                  <div className="text-muted-foreground">{infoDescription}</div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
        <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs tabular-nums">
          {display}
        </span>
      </div>
      <div className="relative">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 h-1.5 w-full cursor-pointer opacity-0"
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-muted/50 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
            value === o.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ChartFiltersPanel({
  open,
  onOpenChange,
  filters,
  onChange,
  onReset,
  onToggleCategory,
}: ChartFiltersPanelProps) {
  const directionOptions: { value: ChartPatternDirectionFilter; label: string }[] = [
    { value: "all", label: "Todas" },
    { value: "bull", label: "Alcistas" },
    { value: "bear", label: "Bajistas" },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle>Filtros del gráfico</SheetTitle>
          <SheetDescription>
            Umbrales de patrones, niveles S/R y proyección. Se guardan automáticamente.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
          <FilterSection
            title="Patrones"
            description="Qué señales aparecen en el histórico"
          >
            <SliderControl
              id="min-pattern-conf"
              label="Confianza mínima"
              min={0}
              max={100}
              step={5}
              value={Math.round(filters.minPatternConfidence * 100)}
              display={`${Math.round(filters.minPatternConfidence * 100)}%`}
              onChange={(v) => onChange({ minPatternConfidence: v / 100 })}
              infoTitle="Confianza mínima del patrón"
              infoDescription={
                <p>
                  Define qué tan "perfecto" debe ser el patrón según sus reglas técnicas (ej. proporciones, volumen). Los patrones con baja confianza pueden ser falsos positivos. <strong>Se recomienda ≥ 65%</strong> para mayor fiabilidad.
                </p>
              }
            />
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs font-normal text-muted-foreground">Estado</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-foreground transition-colors cursor-help">
                      <Info className="h-3 w-3" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="start" className="w-72 p-3 z-[100]">
                    <div className="space-y-2 text-xs font-normal text-foreground">
                      <h4 className="font-semibold text-sm">Estado de la señal</h4>
                      <div className="text-muted-foreground">
                        <p><strong>Confirmado:</strong> Patrones que ya cerraron y dispararon señal de entrada.</p>
                        <p><strong>Pendiente:</strong> Patrones en formación (la vela actual aún no cierra).</p>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <SegmentedControl<ChartPatternStatusFilter>
                value={filters.patternStatus}
                options={PATTERN_STATUS_OPTIONS}
                onChange={(v) => onChange({ patternStatus: v })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-normal text-muted-foreground">Dirección</Label>
              <SegmentedControl
                value={filters.patternDirection}
                options={directionOptions}
                onChange={(v) => onChange({ patternDirection: v })}
              />
            </div>
            <SliderControl
              id="max-markers"
              label="Máximo de marcadores"
              min={10}
              max={200}
              step={10}
              value={filters.maxMarkers}
              display={String(filters.maxMarkers)}
              onChange={(v) => onChange({ maxMarkers: v })}
              infoTitle="Límite visual"
              infoDescription={
                <p>
                  Restringe cuántos iconos de patrones se muestran simultáneamente en el gráfico para evitar sobrecargar la interfaz y mejorar el rendimiento.
                </p>
              }
            />
            <div className="space-y-2">
              <Label className="text-xs font-normal text-muted-foreground">
                Categorías
                <span className="ml-1 font-normal text-muted-foreground/80">
                  (ninguna = todas)
                </span>
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {PATTERN_CATEGORY_OPTIONS.map((c) => {
                  const selected = filters.patternCategories.includes(c.value);
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => onToggleCategory(c.value)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition-colors",
                        selected
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                      )}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </FilterSection>

          <Separator />

          <FilterSection
            title="Soportes y resistencias"
            description="Top niveles por fuerza relativa"
          >
            <SliderControl
              id="min-level-strength"
              label="Fuerza mínima"
              min={0}
              max={100}
              step={5}
              value={Math.round(filters.minLevelStrength * 100)}
              display={`${Math.round(filters.minLevelStrength * 100)}%`}
              onChange={(v) => onChange({ minLevelStrength: v / 100 })}
              infoTitle="Fuerza del nivel (Score)"
              infoDescription={
                <p>
                  La fuerza de un nivel se calcula por la cantidad de "toques" históricos, volumen negociado cerca del nivel y su proximidad a números redondos. <strong>Valores altos filtran niveles débiles.</strong>
                </p>
              }
            />
            <SliderControl
              id="max-levels"
              label="Top por lado"
              min={1}
              max={15}
              step={1}
              value={filters.maxLevelsPerSide}
              display={`${filters.maxLevelsPerSide} S · ${filters.maxLevelsPerSide} R`}
              onChange={(v) => onChange({ maxLevelsPerSide: v })}
              infoTitle="Niveles por dirección"
              infoDescription={
                <p>
                  Muestra como máximo N soportes (por debajo del precio) y N resistencias (por encima del precio), priorizando siempre los de mayor fuerza relativa.
                </p>
              }
            />
          </FilterSection>

          <Separator />

          <FilterSection
            title="Proyección y setup"
            description="Visibilidad según confluencia del análisis"
          >
            <SliderControl
              id="min-confluence"
              label="Confluencia mínima"
              min={0}
              max={100}
              step={5}
              value={filters.minConfluence}
              display={`${filters.minConfluence}%`}
              onChange={(v) => onChange({ minConfluence: v })}
              infoTitle="Confluencia (Setup)"
              infoDescription={
                <p>
                  Una puntuación que combina la señal del patrón con el contexto del mercado (niveles cercanos, tendencia, volumen). Un alto % indica una operación con múltiples factores a favor.
                </p>
              }
            />
            <SliderControl
              id="projection-bars"
              label="Velas proyectadas"
              min={4}
              max={48}
              step={2}
              value={filters.projectionBars}
              display={String(filters.projectionBars)}
              onChange={(v) => onChange({ projectionBars: v })}
              infoTitle="Horizonte de proyección"
              infoDescription={
                <p>
                  Cuántas velas hacia el futuro se dibujará el área de predicción del precio cuando existe un setup válido.
                </p>
              }
            />
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <div>
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="show-setup" className="text-sm cursor-pointer">
                    Líneas Entry / SL / TP
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground transition-colors cursor-help">
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="top" align="start" className="w-72 p-3 z-[100]">
                      <div className="space-y-2 text-xs font-normal text-foreground">
                        <h4 className="font-semibold text-sm">Zonas de riesgo/beneficio</h4>
                        <div className="text-muted-foreground">
                          <p>
                            Dibuja niveles visuales de entrada (Entry), límite de pérdida (Stop Loss) y toma de beneficios (Take Profit) en el gráfico si la confluencia cumple el umbral establecido.
                          </p>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Requiere confluencia ≥ umbral
                </p>
              </div>
              <Switch
                id="show-setup"
                checked={filters.showTradeSetup}
                onCheckedChange={(v) => onChange({ showTradeSetup: v })}
              />
            </div>
          </FilterSection>
        </div>

        <SheetFooter className="border-t px-4 py-3">
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={onReset}>
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Restaurar predeterminados
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
