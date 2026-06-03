"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor } from "lucide-react";
import { env } from "@/lib/env";

const ENDPOINTS = [
  "/health",
  "/ohlcv/{symbol}",
  "/analysis/{symbol}",
  "/sentiment/{symbol}",
  "/news/{symbol}",
  "/backtest/{symbol}",
  "/ranking",
  "/context/{symbol}",
] as const;

export function ApiStatusPanel() {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`${env.apiBase}/health`)
      .then((r) => r.ok)
      .then(setOk)
      .catch(() => setOk(false));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Monitor className="h-4 w-4" /> API Belfort
        </CardTitle>
        <CardDescription>{env.apiBase}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span>Estado</span>
          {ok === null ? (
            <Badge variant="outline">Comprobando…</Badge>
          ) : ok ? (
            <Badge variant="outline" className="text-emerald-500 border-emerald-500/40">
              Conectado
            </Badge>
          ) : (
            <Badge variant="outline" className="text-red-500 border-red-500/40">
              Sin conexión
            </Badge>
          )}
        </div>
        {ENDPOINTS.map((ep) => (
          <div key={ep} className="flex items-center justify-between">
            <code className="text-xs text-muted-foreground">{ep}</code>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
