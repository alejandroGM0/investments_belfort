import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ConfluenceScoreProps {
  score: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function scoreLabel(score: number): string {
  if (score >= 75) return "Señal Clara";
  if (score >= 55) return "Señal Moderada";
  if (score >= 35) return "Señal Débil";
  return "Sin Señal";
}

function scoreColor(score: number): string {
  if (score >= 75) return "text-emerald-500";
  if (score >= 55) return "text-yellow-500";
  return "text-red-500";
}

function strokeColor(score: number): string {
  if (score >= 75) return "stroke-emerald-500";
  if (score >= 55) return "stroke-yellow-500";
  return "stroke-red-500";
}

export function ConfluenceScore({ score, size = "md", className }: ConfluenceScoreProps) {
  const r = size === "lg" ? 44 : size === "md" ? 36 : 28;
  const cx = r + 8;
  const circumference = 2 * Math.PI * r;
  const progress = ((100 - score) / 100) * circumference;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex flex-col items-center gap-1 hover:bg-muted/50 p-2 rounded-xl transition-colors group cursor-help",
            className
          )}
        >
          <div className="relative">
            <svg
              width={cx * 2}
              height={cx * 2}
              className="-rotate-90"
              aria-label={`Score: ${score}`}
            >
              <circle
                cx={cx}
                cy={cx}
                r={r}
                fill="none"
                stroke="currentColor"
                strokeWidth={size === "lg" ? 8 : 6}
                className="text-muted/40"
              />
              <circle
                cx={cx}
                cy={cx}
                r={r}
                fill="none"
                strokeWidth={size === "lg" ? 8 : 6}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={progress}
                className={cn("transition-all duration-700", strokeColor(score))}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("font-bold tabular-nums", size === "lg" ? "text-2xl" : "text-lg", scoreColor(score))}>
                {score}
              </span>
              {size === "lg" && <span className="text-xs text-muted-foreground">/100</span>}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn("text-xs font-medium", scoreColor(score))}>{scoreLabel(score)}</span>
            <Info className="h-3.5 w-3.5 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="center" className="w-80 p-4">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm">Score de Confluencia (Técnico)</h4>
            <p className="text-[11px] text-muted-foreground mt-1 mb-1">
              <strong>¿Qué es la confluencia?</strong> Es cuando múltiples señales y factores técnicos apuntan en la misma dirección, aumentando la probabilidad de una operación.
            </p>
            <p className="text-[11px] text-muted-foreground">
              Este score evalúa esa fuerza general y otorga una puntuación de 0 a 100 basada en:
            </p>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center border-b pb-1">
              <span className="font-medium">1. Señales de Patrones</span>
              <span className="text-muted-foreground">40%</span>
            </div>
            <div className="flex justify-between items-center border-b pb-1">
              <span className="font-medium">2. Alineación de Tendencia (HTF)</span>
              <span className="text-muted-foreground">25%</span>
            </div>
            <div className="flex justify-between items-center border-b pb-1">
              <span className="font-medium">3. Historial de Backtest (Win Rate)</span>
              <span className="text-muted-foreground">20%</span>
            </div>
            <div className="flex justify-between items-center border-b pb-1">
              <span className="font-medium">4. Proximidad a Soporte/Resistencia</span>
              <span className="text-muted-foreground">15%</span>
            </div>
          </div>
          <div className="pt-1">
            <p className="text-[11px] text-muted-foreground">
              <strong>Leyenda:</strong> <span className="text-emerald-500 font-medium">≥75 Clara</span>, <span className="text-yellow-500 font-medium">≥55 Moderada</span>, <span className="text-red-500 font-medium">{"<"}55 Débil</span>
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
