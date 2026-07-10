import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ShieldCheck, Route as RouteIcon, ScanSearch, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneFrame } from "@/components/safesphere/phone-frame";
import { MapBackground } from "@/components/safesphere/map-background";
import { SafetyRing } from "@/components/safesphere/safety-ring";
import { RiskBadge } from "@/components/safesphere/risk-badge";

export const Route = createFileRoute("/")({
  component: Landing,
});

const features = [
  { icon: RouteIcon, title: "Route Intelligence", desc: "AI-powered route risk intelligence, in real time." },
  { icon: ShieldCheck, title: "Guardian Shield", desc: "Live monitoring & auto emergency response." },
  { icon: ScanSearch, title: "AI Threat Scanner", desc: "Detects harassment in messages instantly." },
];

function Landing() {
  return (
    <PhoneFrame>
      <div className="relative flex-1 overflow-hidden">
        <div className="relative h-[46%] min-h-[340px] overflow-hidden">
          <MapBackground route />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 pt-7">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <span className="font-display text-lg font-extrabold">SafeSphere</span>
            </div>
            <span className="bg-card border border-border rounded-full px-3 py-1 text-[11px] font-semibold text-muted-foreground shadow-[var(--shadow-soft)]">
              by IgniteX
            </span>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.1 }}
            className="bg-card border border-border absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-[1.6rem] p-3 pr-5 shadow-[var(--shadow-soft)]"
          >
            <SafetyRing score={92} size={78} strokeWidth={9} label="Score" />
            <div>
              <RiskBadge risk="low" />
              <p className="mt-1.5 text-sm font-semibold">Guardian Active 🛡️</p>
              <p className="text-xs text-muted-foreground">ETA 15 min · Well-lit route</p>
            </div>
          </motion.div>
        </div>

        <div className="flex flex-1 flex-col px-6 pb-8 pt-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 120, damping: 16 }}
          >
            <div className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              <Sparkles className="h-3.5 w-3.5" /> AI-powered safety companion
            </div>
            <h1 className="mt-4 font-display text-[2.1rem] font-extrabold leading-[1.05]">
              Never travel <span className="text-gradient-primary">unprotected</span> again.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              SafeSphere gives you AI-powered route risk intelligence — contextual safety scoring from route type,
              time, nearby safe locations and activity, with automatic emergency response.
            </p>
          </motion.div>

          <div className="mt-6 space-y-2.5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="bg-card border border-border flex items-center gap-3 rounded-2xl p-3 shadow-[var(--shadow-soft)]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-foreground">
                  <f.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold">{f.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-auto space-y-3 pt-6">
            <Button asChild variant="hero" size="pill" className="w-full">
              <Link to="/auth">
                Set up my protection <ChevronRight className="h-5 w-5" />
              </Link>
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Already protected?{" "}
              <Link to="/dashboard" className="font-semibold text-foreground underline underline-offset-2">
                Open dashboard
              </Link>
            </p>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}
