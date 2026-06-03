import Link from "next/link";
import { ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { components } from "@/api/types";

type PatternItem = components["schemas"]["PatternItem"];

const directionConfig = {
  bull: { Icon: TrendingUp, color: "text-emerald-500 bg-emerald-500/10" },
  bear: { Icon: TrendingDown, color: "text-red-500 bg-red-500/10" },
  neutral: { Icon: Minus, color: "text-yellow-500 bg-yellow-500/10" },
};

interface TopSignalsListProps {
  patterns: PatternItem[];
  symbol: string;
}

export function TopSignalsList({ patterns, symbol }: TopSignalsListProps) {
  const top = patterns.slice(0, 5);
  return (
    <div className="space-y-2">
      {top.map((p) => {
        const { Icon, color } = directionConfig[p.direction] ?? directionConfig.neutral;
        return (
          <div key={p.id} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
            <div className={cn("rounded p-1", color)}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.tf} · {Math.round(p.confidence * 100)}% conf.</p>
            </div>
            <span className={cn("text-xs font-semibold", color.split(" ")[0])}>
              {p.direction === "bull" ? "↑" : p.direction === "bear" ? "↓" : "→"}
            </span>
          </div>
        );
      })}
      {top.length > 0 && (
        <Link
          href={`/asset/${symbol}/technical`}
          className="flex items-center justify-center gap-1 rounded-lg border border-dashed p-2 text-xs text-muted-foreground hover:text-foreground hover:border-border transition-colors"
        >
          Ver análisis completo <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
