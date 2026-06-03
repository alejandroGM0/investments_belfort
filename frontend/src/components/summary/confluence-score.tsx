import { cn } from "@/lib/utils";

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
    <div className={cn("flex flex-col items-center gap-1", className)}>
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
      <span className={cn("text-xs font-medium", scoreColor(score))}>{scoreLabel(score)}</span>
    </div>
  );
}
