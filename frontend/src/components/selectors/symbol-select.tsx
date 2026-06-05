"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { WATCHLIST_DEFAULT } from "@/lib/env";

const ALL_SYMBOLS = Array.from(
  new Set([...WATCHLIST_DEFAULT, "DOGE", "ATOM", "FTM", "ARB", "OP", "INJ", "TIA"])
);

interface SymbolSelectProps {
  navigateOnChange?: boolean;
}

export function SymbolSelect({ navigateOnChange = false }: SymbolSelectProps) {
  const [open, setOpen] = useState(false);
  const { symbol, setSymbol } = useAppStore();
  const router = useRouter();
  const pathname = usePathname();

  function handleSelect(value: string) {
    setSymbol(value);
    setOpen(false);
    if (navigateOnChange) {
      const parts = pathname.split("/");
      if (parts[1] === "asset" && parts[2]) {
        parts[2] = value;
        router.push(parts.join("/"));
      } else {
        router.push(`/asset/${value}`);
      }
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="inline-flex h-10 w-36 items-center justify-between gap-2 rounded-xl border border-border/60 bg-card px-4 font-mono text-sm font-bold shadow-sm transition-all hover:bg-accent/50 hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
        aria-label="Select symbol"
      >
        <span className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">{symbol}</span>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground/70" />
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1 rounded-xl shadow-lg border-border/50" align="start">
        <Command>
          <CommandInput placeholder="Buscar cripto..." />
          <CommandList>
            <CommandEmpty>No encontrado.</CommandEmpty>
            <CommandGroup>
              {ALL_SYMBOLS.map((sym) => (
                <CommandItem key={sym} value={sym} onSelect={handleSelect}>
                  <Check className={cn("mr-2 h-4 w-4", symbol === sym ? "opacity-100" : "opacity-0")} />
                  <span className="font-mono font-medium">{sym}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
