"use client";

import { useAppStore, type HistoryDepth } from "@/stores/app-store";

const OPTIONS: { value: HistoryDepth; label: string }[] = [
  { value: "2y", label: "2 años" },
  { value: "5y", label: "5 años" },
  { value: "max", label: "Máximo" },
];

export function HistorySelect() {
  const { history, setHistory } = useAppStore();

  return (
    <select
      id="history-select"
      value={history}
      onChange={(e) => setHistory(e.target.value as HistoryDepth)}
      className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
      title="Profundidad histórica"
    >
      {OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
