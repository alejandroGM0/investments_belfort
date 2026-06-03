import { cn } from "@/lib/utils";
import { fmtPrice } from "@/lib/utils";
import type { components } from "@/api/types";

type Level = components["schemas"]["Level"];

interface LevelsPanelProps {
  levels: Level[];
}

export function LevelsPanel({ levels }: LevelsPanelProps) {
  const supports = levels.filter((l) => l.type === "support").sort((a, b) => b.price - a.price);
  const resistances = levels.filter((l) => l.type === "resistance").sort((a, b) => a.price - b.price);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Resistencias */}
      <div className="rounded-xl border overflow-hidden">
        <div className="bg-red-500/10 px-4 py-2 border-b">
          <h4 className="text-xs font-semibold text-red-500 uppercase tracking-wide">Resistencias</h4>
        </div>
        {resistances.map((lvl) => (
          <div key={lvl.price} className="flex items-center justify-between px-4 py-2.5 border-b last:border-0 hover:bg-muted/30">
            <span className="font-mono font-semibold">{fmtPrice(lvl.price)}</span>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-red-500/60 rounded-full" style={{ width: `${lvl.strength * 100}%` }} />
              </div>
              <span className="text-xs text-muted-foreground w-8 text-right">{Math.round(lvl.strength * 100)}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Soportes */}
      <div className="rounded-xl border overflow-hidden">
        <div className="bg-emerald-500/10 px-4 py-2 border-b">
          <h4 className="text-xs font-semibold text-emerald-500 uppercase tracking-wide">Soportes</h4>
        </div>
        {supports.map((lvl) => (
          <div key={lvl.price} className="flex items-center justify-between px-4 py-2.5 border-b last:border-0 hover:bg-muted/30">
            <span className="font-mono font-semibold">{fmtPrice(lvl.price)}</span>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-emerald-500/60 rounded-full" style={{ width: `${lvl.strength * 100}%` }} />
              </div>
              <span className="text-xs text-muted-foreground w-8 text-right">{Math.round(lvl.strength * 100)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
