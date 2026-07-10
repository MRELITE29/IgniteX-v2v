import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ShieldCheck, Lock, User, Siren } from "lucide-react";
import { cn } from "@/lib/utils";
import { PhoneFrame } from "./phone-frame";

const navItems = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/guardian", label: "Guardian", icon: ShieldCheck },
  { to: "/vault", label: "Shield Hub", icon: Lock },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function MobileShell({ children, padded = true }: { children: ReactNode; padded?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <PhoneFrame>
      <div className={cn("flex flex-1 flex-col pb-28", padded && "px-5")}>{children}</div>

      <nav className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center px-5 pb-4">
        <div className="bg-card border border-border shadow-[var(--shadow-soft)] pointer-events-auto flex w-full max-w-sm items-center justify-between rounded-[2rem] px-3 py-2.5">
          {navItems.slice(0, 2).map((item) => (
            <NavButton key={item.to} {...item} active={pathname === item.to} />
          ))}

          <Link
            to="/sos"
            aria-label="Emergency SOS"
            className="relative -mt-8 grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[image:var(--gradient-danger)] text-danger-foreground shadow-[var(--shadow-glow-danger)] transition-transform active:scale-90"
          >
            <span className="absolute inset-0 rounded-full bg-danger/50 pulse-ring" />
            <Siren className="relative h-7 w-7" strokeWidth={2.4} />
          </Link>

          {navItems.slice(2).map((item) => (
            <NavButton key={item.to} {...item} active={pathname === item.to} />
          ))}
        </div>
      </nav>
    </PhoneFrame>
  );
}

function NavButton({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex w-14 flex-col items-center gap-1 rounded-2xl py-1.5 text-[10px] font-semibold transition-colors",
        active ? "text-primary-foreground" : "text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "grid h-9 w-9 place-items-center rounded-xl transition-all",
          active ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]" : "text-muted-foreground",
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <span className={cn(active ? "text-foreground" : "text-muted-foreground")}>{label}</span>
    </Link>
  );
}