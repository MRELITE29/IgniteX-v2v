import { cn } from "@/lib/utils";

interface SafetyRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  tone?: "safe" | "caution" | "danger";
  className?: string;
}

const toneColor: Record<string, string> = {
  safe: "var(--safe)",
  caution: "var(--caution)",
  danger: "var(--danger)",
};

export function SafetyRing({
  score,
  size = 132,
  strokeWidth = 12,
  label = "Safety Score",
  tone = "safe",
  className,
}: SafetyRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(Math.max(score, 0), 100) / 100) * circumference;
  const color = toneColor[tone] ?? toneColor.safe;

  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.34,1.56,0.64,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="font-display text-3xl font-extrabold leading-none text-foreground">{score}</span>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}