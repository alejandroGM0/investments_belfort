import { cn } from "@/lib/utils";
import type { components } from "@/api/types";

type IndicatorItem = components["schemas"]["IndicatorItem"];

const signalConfig = {
  bullish: "text-emerald-500",
  bearish: "text-red-500",
  neutral: "text-yellow-500",
};

const zoneLabel: Record<string, string> = {
  overbought: "Sobrecompra",
  oversold: "Sobreventa",
  neutral: "Neutro",
};

interface IndicatorCompactTableProps {
  indicators: IndicatorItem[];
}

export function IndicatorCompactTable({ indicators }: IndicatorCompactTableProps) {
  return (
    <div className="rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Indicador</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Valor</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Señal</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Zona</th>
          </tr>
        </thead>
        <tbody>
          {indicators.map((ind, i) => (
            <tr key={ind.name} className={cn("border-b last:border-0", i % 2 === 0 ? "bg-card" : "bg-muted/10")}>
              <td className="px-4 py-2.5 font-medium">{ind.name}</td>
              <td className="px-4 py-2.5 text-right font-mono text-sm tabular-nums">
                {typeof ind.value === "number" && ind.value > 1_000_000
                  ? (ind.value / 1e9).toFixed(2) + "B"
                  : Number(ind.value).toLocaleString("en-US", { maximumFractionDigits: 2 })}
              </td>
              <td className={cn("px-4 py-2.5 text-right text-xs font-semibold", signalConfig[ind.signal])}>
                {ind.signal === "bullish" ? "↑ Alcista" : ind.signal === "bearish" ? "↓ Bajista" : "→ Neutro"}
              </td>
              <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                {ind.zone ? zoneLabel[ind.zone] ?? ind.zone : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
