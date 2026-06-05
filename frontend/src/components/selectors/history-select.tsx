"use client";

import { useAppStore, type HistoryDepth } from "@/stores/app-store";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History } from "lucide-react";

const OPTIONS: { value: HistoryDepth; label: string }[] = [
  { value: "2y", label: "2 años" },
  { value: "5y", label: "5 años" },
  { value: "max", label: "Máximo" },
];

export function HistorySelect() {
  const { history, setHistory } = useAppStore();

  return (
    <div className="flex items-center gap-2">
      <History className="h-4 w-4 text-muted-foreground" />
      <Select
        value={history}
        onValueChange={(v) => setHistory(v as HistoryDepth)}
      >
        <SelectTrigger className="w-28 h-8 rounded-lg bg-card border-border/60 hover:bg-accent/50 hover:border-primary/40 transition-all font-medium text-xs">
          <SelectValue placeholder="Historial" />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
