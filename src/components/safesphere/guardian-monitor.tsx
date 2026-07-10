import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { ShieldCheck, ShieldAlert, Activity, Check, MapPin, Users, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { emergencyProtocol } from "@/lib/app-data";
import { dataService } from "@/lib/data-service";

/**
 * Guardian Shield emergency flow:
 * Guardian Active → Safety monitoring → Risk detected → User confirmation
 * required → No response → Emergency Protocol Activated.
 */
type Phase = "monitoring" | "confirm" | "protocol";

const CONFIRM_SECONDS = 10;

export function GuardianMonitor({ active }: { active: boolean }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("monitoring");
  const [count, setCount] = useState(CONFIRM_SECONDS);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset to monitoring whenever the shield is toggled.
  useEffect(() => {
    setPhase("monitoring");
    setCount(CONFIRM_SECONDS);
  }, [active]);

  // Countdown while awaiting user confirmation. No response → Emergency Protocol.
  useEffect(() => {
    if (phase !== "confirm") return;
    timer.current = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(timer.current!);
          escalate();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const detectRisk = () => {
    setCount(CONFIRM_SECONDS);
    setPhase("confirm");
    toast("Risk detected on your route — please confirm you're safe");
  };

  const confirmSafe = () => {
    if (timer.current) clearInterval(timer.current);
    setPhase("monitoring");
    setCount(CONFIRM_SECONDS);
    toast.success("Marked safe — Guardian Shield keeps monitoring 💚");
  };

  const escalate = () => {
    if (timer.current) clearInterval(timer.current);
    setPhase("protocol");
    toast.error("No response — Emergency Protocol activated 🚨");
    // Persist the incident so it appears in the Shield Hub history.
    dataService.createIncident({ risk: "high", location: "Live route" }).catch(() => {});
  };

  if (!active) return null;

  return (
    <>
      {/* Monitoring status + demo trigger inside the dashboard card */}
      <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-primary/10 px-3 py-2.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-primary pulse-ring" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
        </span>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Activity className="h-3.5 w-3.5 text-primary" /> Safety monitoring active
        </span>
        <button
          onClick={detectRisk}
          className="ml-auto rounded-full bg-card px-2.5 py-1 text-[10px] font-bold text-muted-foreground shadow-[var(--shadow-soft)] transition-colors hover:text-foreground"
        >
          Simulate risk
        </button>
      </div>

      {/* Confirmation + Emergency Protocol overlay (kept inside the phone frame) */}
      <AnimatePresence>
        {phase !== "monitoring" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-background/70 px-6 backdrop-blur-sm"
          >
            {phase === "confirm" ? (
              <motion.div
                key="confirm"
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm rounded-[2rem] border border-caution/40 bg-card p-6 text-center shadow-[var(--shadow-soft)]"
              >
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-caution/20 text-caution-foreground">
                  <ShieldAlert className="h-8 w-8" />
                </span>
                <p className="mt-4 text-lg font-extrabold">Are you safe?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Unusual activity detected on your route. Confirm within{" "}
                  <span className="font-bold text-foreground">{count}s</span> or the Emergency
                  Protocol activates automatically.
                </p>
                <div className="mx-auto mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-caution"
                    initial={{ width: "100%" }}
                    animate={{ width: `${(count / CONFIRM_SECONDS) * 100}%` }}
                    transition={{ duration: 1, ease: "linear" }}
                  />
                </div>
                <div className="mt-5 space-y-2.5">
                  <Button variant="hero" size="pill" className="w-full" onClick={confirmSafe}>
                    <ShieldCheck className="h-5 w-5" /> I'm safe
                  </Button>
                  <Button variant="danger" size="pill" className="w-full" onClick={escalate}>
                    <ShieldAlert className="h-5 w-5" /> I need help now
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="protocol"
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm rounded-[2rem] border border-danger/40 bg-card p-6 text-center shadow-[var(--shadow-soft)]"
              >
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-danger/15 text-danger">
                  <ShieldAlert className="h-8 w-8" />
                </span>
                <p className="mt-4 text-lg font-extrabold text-danger">Emergency Protocol activated</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  You didn't respond, so SafeSphere took over.
                </p>
                <div className="mt-4 space-y-2 text-left">
                  {emergencyProtocol.map((step, i) => (
                    <ProtocolRow key={step.title} index={i} title={step.title} sub={step.sub} delay={0.2 + i * 0.35} />
                  ))}
                </div>
                <div className="mt-5 space-y-2.5">
                  <Button variant="danger" size="pill" className="w-full" onClick={() => navigate({ to: "/sos" })}>
                    <ShieldAlert className="h-5 w-5" /> Open Emergency SOS
                  </Button>
                  <Button variant="secondary" size="pill" className="w-full" onClick={confirmSafe}>
                    I'm safe — stand down
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const protocolIcon = [MapPin, Users, Lock] as const;

function ProtocolRow({ index, title, sub, delay }: { index: number; title: string; sub: string; delay: number }) {
  const [done, setDone] = useState(false);
  const Icon = protocolIcon[index] ?? MapPin;
  useEffect(() => {
    const t = setTimeout(() => setDone(true), delay * 1000 + 300);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-muted/50 p-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-danger/10 text-danger">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
      </div>
      {done ? (
        <span className="grid h-6 w-6 place-items-center rounded-full bg-safe text-safe-foreground">
          <Check className="h-4 w-4" />
        </span>
      ) : (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-danger" />
      )}
    </div>
  );
}
