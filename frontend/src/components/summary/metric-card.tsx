import { type LucideIcon, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  className?: string;
  info?: React.ReactNode;
}

export function MetricCard({ title, value, subtitle, icon: Icon, trend, className, info }: MetricCardProps) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
              {info && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-foreground cursor-help transition-colors">
                      <Info className="h-3 w-3" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="start" className="w-64 p-3 text-xs">
                    {info}
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <div className="text-2xl font-bold tabular-nums">{value}</div>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {Icon && (
            <div className="rounded-md bg-muted p-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>
        {trend && (
          <div
            className={cn(
              "absolute bottom-0 left-0 h-0.5 w-full",
              trend === "up" && "bg-emerald-500",
              trend === "down" && "bg-red-500",
              trend === "neutral" && "bg-yellow-500"
            )}
          />
        )}
      </CardContent>
    </Card>
  );
}
