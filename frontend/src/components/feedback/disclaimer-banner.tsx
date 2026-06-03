import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface DisclaimerBannerProps {
  message?: string;
  className?: string;
}

export function DisclaimerBanner({
  message = "Los análisis y probabilidades mostrados se basan en datos históricos y no constituyen asesoramiento financiero. Opere siempre con gestión de riesgo adecuada.",
  className,
}: DisclaimerBannerProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 text-xs text-yellow-500/80",
        className
      )}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
