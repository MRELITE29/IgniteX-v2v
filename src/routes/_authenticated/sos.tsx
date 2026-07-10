import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { X, Check, MapPin, Users, Lock, ShieldCheck, PhoneCall } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneFrame } from "@/components/safesphere/phone-frame";
import { useQueryClient } from "@tanstack/react-query";
import { type Profile, type GuardianContact } from "@/lib/data-service";
import { executeEmergencyProtocol } from "@/lib/emergency-protocol";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sos")({
  head: () => ({ meta: [{ title: "Emergency SOS — SafeSphere" }] }),
  component: SOS,
});

type Phase = "countdown" | "active";



function SOS() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const profile = qc.getQueryData<Profile>(["profile"]);
  const guardians = qc.getQueryData<GuardianContact[]>(["guardians"]) ?? [];

  const [locStatus, setLocStatus] = useState<"idle" | "loading" | "success" | "failed">("idle");
  const [vapiStatus, setVapiStatus] = useState<"idle" | "loading" | "success" | "failed">("idle");
  const [evidenceStatus, setEvidenceStatus] = useState<"idle" | "loading" | "success" | "failed">("idle");
  const executed = useRef(false);

  const emergencyActions = [
    { icon: MapPin, title: "Location shared", sub: profile?.address || "Live location", status: locStatus },
    { icon: Users, title: "Guardians notified", sub: `${guardians.length} contacts alerted`, status: vapiStatus },
    { icon: Lock, title: "Evidence vault activated", sub: "Audio & location recording", status: evidenceStatus },
  ];

  const executeEmergency = async () => {
    executeEmergencyProtocol(
      qc,
      (state) => {
        if (state.locStatus) setLocStatus(state.locStatus);
        if (state.vapiStatus) setVapiStatus(state.vapiStatus);
        if (state.evidenceStatus) setEvidenceStatus(state.evidenceStatus);
      },
      "Manual SOS"
    );
  };

  useEffect(() => {
    if (!executed.current) {
      executed.current = true;
      executeEmergency();
    }
  }, []);

  return (
    <PhoneFrame>
      {/* Emergency red is used ONLY here — the app is in an active danger state. */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_oklch(0.72_0.22_25)_0%,_oklch(0.52_0.21_18)_58%,_oklch(0.4_0.16_15)_100%)] px-6 text-center">
        {/* Ambient danger glow layers */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_oklch(0.9_0.15_25/0.25)_0%,_transparent_60%)]"
          animate={{ opacity: [0.35, 0.7, 0.35], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 flex w-full flex-col items-center"
          >
            <motion.span
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 16 }}
              className="relative grid h-24 w-24 place-items-center rounded-full bg-danger-foreground/15 text-danger-foreground"
            >
              <span className="absolute inset-0 rounded-full bg-danger-foreground/10 pulse-ring" />
              <ShieldCheck className="h-11 w-11" />
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-6 font-display text-3xl font-extrabold text-danger-foreground"
            >
              Emergency activated
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="mt-2 text-sm text-danger-foreground/90"
            >
              Help protocol running for {profile?.fullName || "User"}.
            </motion.p>

            <div className="bg-card border border-border mt-8 w-full space-y-2.5 rounded-[1.6rem] p-3 text-left shadow-[var(--shadow-soft)]">
              {emergencyActions.map((a, i) => (
                <ActionRow key={a.title} icon={a.icon} title={a.title} sub={a.sub} delay={0.4 + i * 0.5} status={a.status as any} />
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.1 }}
              className="mt-5 w-full space-y-2.5"
            >
              <Button variant="danger" size="pill" className="w-full">
                <PhoneCall className="h-5 w-5" /> Call emergency services
              </Button>
              <Button variant="secondary" size="pill" className="w-full" onClick={() => navigate({ to: "/dashboard" })}>
                Mark resolved & return
              </Button>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </PhoneFrame>
  );
}

function ActionRow({ icon: Icon, title, sub, delay, status }: { icon: LucideIcon; title: string; sub: string; delay: number; status: "idle" | "loading" | "success" | "failed" }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex items-center gap-3 rounded-2xl bg-card border border-border p-3"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
      </div>
      <AnimatePresence mode="wait">
        {status === "failed" ? (
          <motion.span
            key="fail"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="grid h-6 w-6 place-items-center rounded-full bg-danger text-white text-xs font-bold font-sans"
          >
            ✕
          </motion.span>
        ) : status === "success" ? (
          <motion.span
            key="check"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 14 }}
            className="grid h-6 w-6 place-items-center rounded-full bg-safe text-safe-foreground"
          >
            <Check className="h-4 w-4" />
          </motion.span>
        ) : (
          <motion.span
            key="spin"
            exit={{ opacity: 0 }}
            className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-muted border-t-primary"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}