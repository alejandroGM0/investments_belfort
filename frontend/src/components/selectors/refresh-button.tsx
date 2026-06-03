"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function RefreshButton() {
  const queryClient = useQueryClient();
  const { symbol, timeframe, setLastRefreshed } = useAppStore();
  const [spinning, setSpinning] = useState(false);

  async function handleRefresh() {
    setSpinning(true);
    await queryClient.invalidateQueries({ queryKey: ["ohlcv", symbol, timeframe] });
    await queryClient.invalidateQueries({ queryKey: ["analysis", symbol, timeframe] });
    await queryClient.invalidateQueries({ queryKey: ["sentiment", symbol] });
    await queryClient.invalidateQueries({ queryKey: ["news", symbol] });
    setLastRefreshed(new Date().toISOString());
    setTimeout(() => setSpinning(false), 600);
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleRefresh} className="h-8 w-8">
      <RefreshCw className={cn("h-4 w-4", spinning && "animate-spin")} />
    </Button>
  );
}
