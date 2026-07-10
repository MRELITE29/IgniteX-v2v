import mapLight from "@/assets/map-light.jpg";
import { cn } from "@/lib/utils";
import { Cross, Coffee, ShoppingBag, ShieldCheck } from "lucide-react";

interface MapBackgroundProps {
  className?: string;
  route?: boolean;
  tone?: "safe" | "caution" | "danger";
  markers?: boolean;
}

const toneStroke: Record<string, string> = {
  safe: "var(--safe)",
  caution: "var(--caution)",
  danger: "var(--danger)",
};

export function MapBackground({ className, route = true, tone = "safe", markers = true }: MapBackgroundProps) {
  const stroke = toneStroke[tone] ?? toneStroke.safe;
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      <img
        src={mapLight}
        alt=""
        aria-hidden
        className="h-full w-full object-cover opacity-90"
      />
      {/* Soft brand tint + depth gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,_var(--accent)_0%,_transparent_55%)] opacity-70" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-transparent to-background/70" />

      {route && (
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 390 800"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden
        >
          <defs>
            <linearGradient id="routeGrad" x1="0" y1="800" x2="390" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor={stroke} stopOpacity="0.35" />
              <stop offset="1" stopColor={stroke} />
            </linearGradient>
            <radialGradient id="safeZone" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor={stroke} stopOpacity="0.28" />
              <stop offset="1" stopColor={stroke} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Highlighted safe zone around current position */}
          <circle cx="150" cy="470" r="150" fill="url(#safeZone)" />

          <path
            d="M70 700 C 120 560, 90 470, 190 400 C 290 330, 250 230, 320 120"
            stroke="url(#routeGrad)"
            strokeWidth="7"
            strokeLinecap="round"
            opacity="0.35"
          />
          <path
            d="M70 700 C 120 560, 90 470, 190 400 C 290 330, 250 230, 320 120"
            stroke={stroke}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="2 14"
          />
          {/* Destination pin */}
          <circle cx="320" cy="120" r="10" fill={stroke} />
          <circle cx="320" cy="120" r="18" fill={stroke} opacity="0.18" />
          {/* Current position */}
          <circle cx="70" cy="700" r="9" fill="var(--primary)" />
          <circle cx="70" cy="700" r="9" fill="var(--primary)" className="pulse-ring origin-center" />
        </svg>
      )}

      {markers && (
        <div className="pointer-events-none absolute inset-0">
          {/* Guardian avatar markers */}
          <AvatarMarker initials="M" className="left-[16%] top-[24%]" tone={tone} online />
          <AvatarMarker initials="R" className="left-[70%] top-[19%]" tone={tone} online />
          <AvatarMarker initials="P" className="left-[78%] top-[36%]" tone={tone} />

          {/* Points of interest */}
          <PoiMarker icon={Cross} className="left-[40%] top-[16%]" label="Hospital" />
          <PoiMarker icon={ShoppingBag} className="left-[26%] top-[38%]" label="Store" />
          <PoiMarker icon={Coffee} className="left-[55%] top-[31%]" label="Cafe" />
          <PoiMarker icon={ShieldCheck} className="left-[60%] top-[14%]" label="Safe spot" />
        </div>
      )}
    </div>
  );
}

function AvatarMarker({
  initials,
  className,
  tone = "safe",
  online = false,
}: {
  initials: string;
  className?: string;
  tone?: "safe" | "caution" | "danger";
  online?: boolean;
}) {
  return (
    <div className={cn("absolute -translate-x-1/2 -translate-y-1/2 float-soft", className)}>
      <div className="relative">
        <span className="bg-card border border-border shadow-[var(--shadow-soft)] flex h-11 w-11 items-center justify-center rounded-full text-xs font-bold text-foreground shadow-[var(--shadow-soft)] ring-2 ring-primary/60">
          {initials}
        </span>
        {/* Pin tail */}
        <span className="absolute -bottom-1 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 rounded-[3px] bg-[var(--bg-card border border-border shadow-[var(--shadow-soft)]-bg-strong)]" />
        {online && (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
        )}
      </div>
    </div>
  );
}

function PoiMarker({
  icon: Icon,
  className,
  label,
}: {
  icon: typeof Cross;
  className?: string;
  label: string;
}) {
  return (
    <div className={cn("absolute -translate-x-1/2 -translate-y-1/2", className)} aria-label={label}>
      <span className="grid h-7 w-7 place-items-center rounded-full bg-card text-primary shadow-[var(--shadow-soft)] ring-1 ring-primary/25">
        <Icon className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}