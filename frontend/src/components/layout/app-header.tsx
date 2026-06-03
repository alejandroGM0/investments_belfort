import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { MainNav } from "@/components/navigation/main-nav";
import { SymbolSelect } from "@/components/selectors/symbol-select";
import { TimeframeSelect } from "@/components/selectors/timeframe-select";
import { RefreshButton } from "@/components/selectors/refresh-button";
import { HistorySelect } from "@/components/selectors/history-select";
import { LastUpdatedLabel } from "@/components/selectors/last-updated-label";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-primary">
          <TrendingUp className="h-5 w-5" />
          <span className="hidden font-mono text-sm sm:inline">Belfort</span>
        </Link>

        <div className="h-4 w-px bg-border" />

        <MainNav />

        <div className="ml-auto flex items-center gap-2">
          <LastUpdatedLabel />
          <SymbolSelect navigateOnChange />
          <TimeframeSelect />
          <HistorySelect />
          <RefreshButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
