"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ChartOverlays {
  patterns: boolean;
  levels: boolean;
  ema: boolean;
}

interface ChartToolbarProps {
  overlays: ChartOverlays;
  onOverlayChange: (key: keyof ChartOverlays) => void;
}

const overlayLabels: Record<keyof ChartOverlays, string> = {
  patterns: "Patrones",
  levels: "S/R",
  ema: "EMA",
};

export function ChartToolbar({ overlays, onOverlayChange }: ChartToolbarProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground">Overlays:</span>
      {(Object.keys(overlays) as (keyof ChartOverlays)[]).map((key) => (
        <Badge
          key={key}
          variant="outline"
          className={cn(
            "cursor-pointer select-none transition-colors",
            overlays[key] ? "bg-primary/10 border-primary/50 text-primary" : ""
          )}
          onClick={() => onOverlayChange(key)}
        >
          {overlays[key] ? <Eye className="mr-1 h-3 w-3" /> : <EyeOff className="mr-1 h-3 w-3" />}
          {overlayLabels[key]}
        </Badge>
      ))}
    </div>
  );
}
