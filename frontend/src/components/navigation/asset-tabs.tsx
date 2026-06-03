"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "", label: "Resumen" },
  { href: "/chart", label: "Gráfico" },
  { href: "/technical", label: "Técnico" },
  { href: "/sentiment", label: "Sentimiento" },
  { href: "/news", label: "Noticias" },
  { href: "/strategy", label: "Estrategia" },
  { href: "/context", label: "Contexto" },
];

export function AssetTabs({ symbol }: { symbol: string }) {
  const pathname = usePathname();
  const base = `/asset/${symbol}`;

  return (
    <div className="flex overflow-x-auto border-b scrollbar-none">
      {tabs.map(({ href, label }) => {
        const fullHref = `${base}${href}`;
        const active = pathname === fullHref || (href !== "" && pathname.startsWith(fullHref));
        return (
          <Link
            key={href}
            href={fullHref}
            className={cn(
              "shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
