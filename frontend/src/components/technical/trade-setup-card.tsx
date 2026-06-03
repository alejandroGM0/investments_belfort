import { Target, TrendingUp, TrendingDown, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtPrice } from "@/lib/utils";
import type { components } from "@/api/types";

type TradeSetup = components["schemas"]["TradeSetup"];

interface TradeSetupCardProps {
  setup: TradeSetup;
}

export function TradeSetupCard({ setup }: TradeSetupCardProps) {
  const rr = setup.risk_reward?.toFixed(1);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4" /> Setup operativo sugerido
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-lg border bg-muted/20 p-3">
            <TrendingUp className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Entrada</p>
            <p className="font-mono font-bold tabular-nums">{setup.entry ? fmtPrice(setup.entry) : "—"}</p>
          </div>
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
            <Shield className="mx-auto mb-1 h-4 w-4 text-red-500" />
            <p className="text-xs text-red-500/80">Stop Loss</p>
            <p className="font-mono font-bold text-red-500 tabular-nums">{setup.stop_loss ? fmtPrice(setup.stop_loss) : "—"}</p>
          </div>
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
            <TrendingDown className="mx-auto mb-1 h-4 w-4 text-emerald-500 rotate-180" />
            <p className="text-xs text-emerald-500/80">Take Profit</p>
            <p className="font-mono font-bold text-emerald-500 tabular-nums">{setup.take_profit ? fmtPrice(setup.take_profit) : "—"}</p>
          </div>
        </div>
        {rr && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Ratio riesgo/beneficio <span className="font-semibold text-foreground">{rr}:1</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
