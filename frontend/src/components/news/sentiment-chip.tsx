import { cn } from "@/lib/utils";

type Tone = "positive" | "negative" | "neutral" | "mixed";

const config: Record<Tone, { label: string; className: string }> = {
  positive: { label: "Positivo", className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  negative: { label: "Negativo", className: "bg-red-500/15 text-red-500 border-red-500/30" },
  neutral: { label: "Neutral", className: "bg-muted text-muted-foreground border-border" },
  mixed: { label: "Mixto", className: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30" },
};

export function SentimentChip({ tone }: { tone: Tone }) {
  const { label, className } = config[tone] ?? config.neutral;
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", className)}>
      {label}
    </span>
  );
}
