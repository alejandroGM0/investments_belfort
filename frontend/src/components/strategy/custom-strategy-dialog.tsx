"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CustomStrategy, CustomStrategyKind } from "@/lib/custom-strategies";

export interface StrategyFormValues {
  name: string;
  kind: CustomStrategyKind;
  direction: "bullish" | "bearish" | "neutral";
  entry: string;
  stop_loss: string;
  take_profit: string;
  sl_atr: string;
  tp_rr: string;
  filter_trend: string;
  filter_rsi: string;
  holding_bars_max: string;
  notes: string;
}

const emptyForm: StrategyFormValues = {
  name: "",
  kind: "setup",
  direction: "bullish",
  entry: "",
  stop_loss: "",
  take_profit: "",
  sl_atr: "1.5",
  tp_rr: "2",
  filter_trend: "none",
  filter_rsi: "none",
  holding_bars_max: "",
  notes: "",
};

function fromStrategy(s: CustomStrategy): StrategyFormValues {
  return {
    name: s.name,
    kind: s.kind,
    direction: (s.direction as StrategyFormValues["direction"]) ?? "bullish",
    entry: s.entry != null ? String(s.entry) : "",
    stop_loss: s.stop_loss != null ? String(s.stop_loss) : "",
    take_profit: s.take_profit != null ? String(s.take_profit) : "",
    sl_atr: s.params?.sl_atr != null ? String(s.params.sl_atr) : "1.5",
    tp_rr: s.params?.tp_rr != null ? String(s.params.tp_rr) : "2",
    filter_trend: s.params?.filter_trend ?? "none",
    filter_rsi: s.params?.filter_rsi ?? "none",
    holding_bars_max:
      s.params?.holding_bars_max != null ? String(s.params.holding_bars_max) : "",
    notes: s.notes ?? "",
  };
}

interface CustomStrategyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: CustomStrategy | null;
  onSubmit: (values: StrategyFormValues) => void;
}

export function CustomStrategyDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: CustomStrategyDialogProps) {
  const [form, setForm] = useState<StrategyFormValues>(emptyForm);

  useEffect(() => {
    if (open) setForm(initial ? fromStrategy(initial) : emptyForm);
  }, [open, initial]);

  function set<K extends keyof StrategyFormValues>(key: K, value: StrategyFormValues[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit(form);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{initial ? "Editar estrategia" : "Nueva estrategia"}</DialogTitle>
            <DialogDescription>
              Setup manual con precios o preset de parámetros de backtest.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="strat-name">Nombre</Label>
              <Input
                id="strat-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Mi scalping BTC"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.kind}
                onValueChange={(v) => v && set("kind", v as CustomStrategyKind)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="setup">Setup (Entry / SL / TP)</SelectItem>
                  <SelectItem value="backtest">Preset backtest (ATR / filtros)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.kind === "setup" ? (
              <>
                <div className="space-y-2">
                  <Label>Dirección</Label>
                  <Select
                    value={form.direction}
                    onValueChange={(v) =>
                      v && set("direction", v as StrategyFormValues["direction"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bullish">Alcista</SelectItem>
                      <SelectItem value="bearish">Bajista</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="entry" className="text-xs">
                      Entrada
                    </Label>
                    <Input
                      id="entry"
                      type="number"
                      step="any"
                      value={form.entry}
                      onChange={(e) => set("entry", e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sl" className="text-xs">
                      Stop loss
                    </Label>
                    <Input
                      id="sl"
                      type="number"
                      step="any"
                      value={form.stop_loss}
                      onChange={(e) => set("stop_loss", e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tp" className="text-xs">
                      Take profit
                    </Label>
                    <Input
                      id="tp"
                      type="number"
                      step="any"
                      value={form.take_profit}
                      onChange={(e) => set("take_profit", e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">SL (× ATR)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.sl_atr}
                    onChange={(e) => set("sl_atr", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">TP (R:R)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.tp_rr}
                    onChange={(e) => set("tp_rr", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Filtro tendencia</Label>
                  <Select value={form.filter_trend} onValueChange={(v) => v && set("filter_trend", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin filtro</SelectItem>
                      <SelectItem value="sma200">Precio &gt; SMA 200</SelectItem>
                      <SelectItem value="adx25">ADX ≥ 25</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Filtro RSI</Label>
                  <Select value={form.filter_rsi} onValueChange={(v) => v && set("filter_rsi", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin filtro</SelectItem>
                      <SelectItem value="oversold">RSI &lt; 40</SelectItem>
                      <SelectItem value="overbought">RSI &gt; 60</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-xs">
                Notas (opcional)
              </Label>
              <Textarea
                id="notes"
                rows={2}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                className="text-sm resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{initial ? "Guardar cambios" : "Crear estrategia"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function formValuesToStrategyDraft(
  values: StrategyFormValues,
  symbol: string
): Omit<import("@/lib/custom-strategies").CustomStrategy, "id" | "createdAt"> {
  if (values.kind === "setup") {
    const entry = parseFloat(values.entry);
    const sl = parseFloat(values.stop_loss);
    const tp = parseFloat(values.take_profit);
    const rr =
      Number.isFinite(entry) && Number.isFinite(sl) && Number.isFinite(tp)
        ? Math.abs(tp - entry) / Math.max(Math.abs(entry - sl), 1e-9)
        : undefined;
    return {
      name: values.name.trim(),
      kind: "setup",
      symbol,
      direction: values.direction,
      entry: Number.isFinite(entry) ? entry : undefined,
      stop_loss: Number.isFinite(sl) ? sl : undefined,
      take_profit: Number.isFinite(tp) ? tp : undefined,
      risk_reward: rr != null ? Math.round(rr * 100) / 100 : undefined,
      notes: values.notes || undefined,
    };
  }
  const holding = values.holding_bars_max ? parseInt(values.holding_bars_max, 10) : null;
  return {
    name: values.name.trim(),
    kind: "backtest",
    symbol,
    params: {
      sl_atr: parseFloat(values.sl_atr) || 1.5,
      tp_rr: parseFloat(values.tp_rr) || 2,
      filter_trend: values.filter_trend,
      filter_rsi: values.filter_rsi,
      holding_bars_max: Number.isFinite(holding!) ? holding : null,
    },
    notes: values.notes || undefined,
  };
}
