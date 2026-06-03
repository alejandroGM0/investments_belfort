import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type Direction = "bullish" | "bearish" | "neutral";

interface TrendBadgeProps {
  direction: Direction;
  size?: "sm" | "md";
  showIcon?: boolean;
  className?: string;
}

const config: Record<Direction, { label: string; className: string; Icon: typeof TrendingUp }> = {
  bullish: { label: "Alcista", className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", Icon: TrendingUp },
  bearish: { label: "Bajista", className: "bg-red-500/15 text-red-500 border-red-500/30", Icon: TrendingDown },
  neutral: { label: "Lateral", className: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30", Icon: Minus },
};

export function TrendBadge({ direction, size = "md", showIcon = true, className }: TrendBadgeProps) {
  const { label, className: cls, Icon } = config[direction];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium",
        size === "sm" ? "text-xs" : "text-sm",
        cls,
        className
      )}
    >
      {showIcon && <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />}
      {label}
    </span>
  );
}
