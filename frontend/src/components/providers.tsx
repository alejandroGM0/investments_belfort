"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/query-client";
import { useEffect, useState } from "react";
import { env } from "@/lib/env";

function MSWProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!env.useMocks);

  useEffect(() => {
    if (!env.useMocks) return;
    import("@/mocks/browser").then(({ worker }) => {
      worker.start({ onUnhandledRequest: "bypass" }).then(() => setReady(true));
    });
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delay={300}>
          <MSWProvider>{children}</MSWProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
