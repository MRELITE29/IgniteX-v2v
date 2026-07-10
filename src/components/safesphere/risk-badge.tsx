import { cn } from "@/lib/utils";
import { type RiskLevel, riskMeta } from "@/lib/app-data";

const toneClasses: Record<string, string> = {
  safe: "bg-safe/15 text-safe-foreground border-safe/30",
  caution: "bg-caution/20 text-caution-foreground border-caution/40",
  danger: "bg-danger/15 text-danger border-danger/30",
};

export function RiskBadge({ risk, className }: { risk: RiskLevel; className?: string }) {
  const meta = riskMeta[risk];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide",
        toneClasses[meta.token],
        className,
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          meta.token === "safe" && "bg-safe",
          meta.token === "caution" && "bg-caution",
          meta.token === "danger" && "bg-danger",
        )}
      />
      {meta.label}
    </span>
  );
}
