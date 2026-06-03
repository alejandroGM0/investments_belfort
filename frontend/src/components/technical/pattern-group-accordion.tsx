"use client";

import { useState } from "react";
import { ChevronDown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { components } from "@/api/types";

type PatternGroup = components["schemas"]["PatternGroup"];
type PatternItem = components["schemas"]["PatternItem"];

const categoryLabels: Record<string, string> = {
  candles: "Velas",
  chart_patterns: "Figuras chartistas",
  trend: "Tendencia",
  structure: "Estructura de mercado",
  indicators: "Indicadores",
  levels: "Niveles S/R",
};

const dirIcons = {
  bull: <TrendingUp className="h-3 w-3 text-emerald-500" />,
  bear: <TrendingDown className="h-3 w-3 text-red-500" />,
  neutral: <Minus className="h-3 w-3 text-yellow-500" />,
};

function PatternRow({ pattern }: { pattern: PatternItem }) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors">
      {dirIcons[pattern.direction] ?? dirIcons.neutral}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{pattern.name}</p>
        {pattern.description && (
          <p className="truncate text-xs text-muted-foreground">{pattern.description}</p>
        )}
      </div>
      <span className="text-xs tabular-nums text-muted-foreground shrink-0">
        {Math.round(pattern.confidence * 100)}%
      </span>
      {pattern.active && (
        <Badge variant="outline" className="h-4 text-[10px] px-1 py-0 text-emerald-500 border-emerald-500/30">
          activo
        </Badge>
      )}
    </div>
  );
}

interface PatternGroupAccordionProps {
  groups: PatternGroup[];
  maxVisible?: number;
}

export function PatternGroupAccordion({ groups, maxVisible = 4 }: PatternGroupAccordionProps) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["candles"]));
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  function toggleGroup(cat: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  function expandGroup(cat: string) {
    setExpandedGroups((prev) => new Set(prev).add(cat));
  }

  return (
    <div className="space-y-2">
      {groups.map((group) => {
        const isOpen = openGroups.has(group.category);
        const isExpanded = expandedGroups.has(group.category);
        const visible = isExpanded ? group.items : group.items.slice(0, maxVisible);
        const hasMore = group.items.length > maxVisible;

        return (
          <div key={group.category} className="rounded-xl border overflow-hidden">
            <button
              className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
              onClick={() => toggleGroup(group.category)}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{categoryLabels[group.category] ?? group.category}</span>
                <Badge variant="secondary" className="text-xs px-1.5">{group.count}</Badge>
              </div>
              <ChevronDown
                className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")}
              />
            </button>

            {isOpen && (
              <div className="border-t bg-card/50 px-1 py-1">
                {visible.map((p) => (
                  <PatternRow key={p.id} pattern={p} />
                ))}
                {hasMore && !isExpanded && (
                  <button
                    className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => expandGroup(group.category)}
                  >
                    Ver {group.items.length - maxVisible} más...
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
