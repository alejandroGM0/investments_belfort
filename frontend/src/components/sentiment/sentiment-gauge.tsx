import { cn } from "@/lib/utils";

interface SentimentGaugeProps {
  score: number;
  className?: string;
}

function toneLabel(score: number): string {
  if (score > 50) return "Muy positivo";
  if (score > 20) return "Positivo";
  if (score > -20) return "Neutral";
  if (score > -50) return "Negativo";
  return "Muy negativo";
}

function toneColor(score: number): string {
  if (score > 20) return "text-emerald-500";
  if (score > -20) return "text-yellow-500";
  return "text-red-500";
}

export function SentimentGauge({ score, className }: SentimentGaugeProps) {
  const pct = ((score + 100) / 200) * 100;
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Muy negativo</span>
        <span className={cn("font-bold text-lg tabular-nums", toneColor(score))}>
          {score > 0 ? "+" : ""}{score}
        </span>
        <span className="text-muted-foreground">Muy positivo</span>
      </div>
      <div className="relative h-3 w-full rounded-full overflow-hidden bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500">
        <div
          className="absolute top-1/2 h-5 w-2 -translate-y-1/2 rounded-full bg-white shadow-md ring-2 ring-background transition-all duration-500"
          style={{ left: `calc(${pct}% - 4px)` }}
        />
      </div>
      <p className={cn("text-center text-sm font-medium", toneColor(score))}>{toneLabel(score)}</p>
    </div>
  );
}
