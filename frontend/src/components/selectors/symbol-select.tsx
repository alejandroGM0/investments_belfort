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
        className="inline-flex h-8 w-32 items-center justify-between gap-1 rounded-lg border border-border bg-background px-2.5 font-mono text-sm font-medium transition-colors hover:bg-muted"
        aria-label="Select symbol"
      >
        {symbol}
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="start">
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
