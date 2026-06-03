"use client";

import { useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TIMEFRAMES, type Timeframe } from "@/lib/env";
import { ApiStatusPanel } from "@/components/settings/api-status-panel";
import { Settings, Plus, X } from "lucide-react";

export default function SettingsPage() {
  const { watchlist, addToWatchlist, removeFromWatchlist, timeframe, setTimeframe } = useAppStore();
  const [newSymbol, setNewSymbol] = useState("");

  function handleAdd() {
    const sym = newSymbol.trim().toUpperCase();
    if (sym) {
      addToWatchlist(sym);
      setNewSymbol("");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Ajustes</h1>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Apariencia</CardTitle>
          <CardDescription>Tema visual de la aplicación</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Cambiar entre modo claro y oscuro</p>
          <ThemeToggle />
        </CardContent>
      </Card>

      {/* Default timeframe */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeframe por defecto</CardTitle>
          <CardDescription>Timeframe que se usa al abrir la app</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={timeframe} onValueChange={(v) => setTimeframe(v as Timeframe)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEFRAMES.map((tf) => (
                <SelectItem key={tf} value={tf}>{tf}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Watchlist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Watchlist</CardTitle>
          <CardDescription>Criptos que aparecen en el ranking y búsquedas rápidas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Añadir símbolo (ej. SOL)"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="uppercase"
              maxLength={10}
            />
            <Button onClick={handleAdd} size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {watchlist.map((sym) => (
              <Badge key={sym} variant="secondary" className="gap-1 pr-1 font-mono">
                {sym}
                <button
                  onClick={() => removeFromWatchlist(sym)}
                  className="ml-1 rounded text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <ApiStatusPanel />
    </div>
  );
}
