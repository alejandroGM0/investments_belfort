import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function scoreColor(score: number, max: number): string {
  const pct = score / max;
  if (pct >= 0.7) return "text-emerald-500 border-emerald-500/30 bg-emerald-500/10";
  if (pct >= 0.45) return "text-yellow-500 border-yellow-500/30 bg-yellow-500/10";
  return "text-red-500 border-red-500/30 bg-red-500/10";
}

export function ScoreBadge({ score, max = 100, size = "md", className }: ScoreBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold tabular-nums",
        size === "sm" && "px-1.5 py-0 text-xs",
        size === "md" && "px-2 py-0.5 text-sm",
        size === "lg" && "px-3 py-1 text-base",
        scoreColor(score, max),
        className
      )}
    >
      {score}
    </span>
  );
}
