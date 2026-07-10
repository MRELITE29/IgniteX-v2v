import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { X, Check, MapPin, Users, Lock, ShieldCheck, PhoneCall } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneFrame } from "@/components/safesphere/phone-frame";
import { useQueryClient } from "@tanstack/react-query";
import { type Profile, type GuardianContact } from "@/lib/data-service";
import { dataService } from "@/lib/data-service";
import { notificationService } from "@/lib/notification-service";
import { locationService } from "@/lib/location-service";
import { captureEmergencyEvidence } from "@/lib/evidence-recorder";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sos")({
  head: () => ({ meta: [{ title: "Emergency SOS — SafeSphere" }] }),
  component: SOS,
});

type Phase = "countdown" | "active";



function SOS() {
  const navigate = useNavigate();
  const [count, setCount] = useState(3);
  const [phase, setPhase] = useState<Phase>("countdown");
  const qc = useQueryClient();
  const profile = qc.getQueryData<Profile>(["profile"]);
  const guardians = qc.getQueryData<GuardianContact[]>(["guardians"]) ?? [];

  const [locStatus, setLocStatus] = useState<"idle" | "loading" | "success" | "failed">("idle");
  const [vapiStatus, setVapiStatus] = useState<"idle" | "loading" | "success" | "failed">("idle");
  const [evidenceStatus, setEvidenceStatus] = useState<"idle" | "loading" | "success" | "failed">("idle");

  const emergencyActions = [
    { icon: MapPin, title: "Location shared", sub: profile?.address || "Live location", status: locStatus },
    { icon: Users, title: "Guardians notified", sub: `${guardians.length} contacts alerted`, status: vapiStatus },
    { icon: Lock, title: "Evidence vault activated", sub: "Audio & location recording", status: evidenceStatus },
  ];

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const executeEmergency = async () => {
    setPhase("active");
    setLocStatus("loading");
    setVapiStatus("loading");
    setEvidenceStatus("loading");

    try {
      let loc = null;
      try {
        loc = await locationService.getCurrentLocation();
        setLocStatus("success");
      } catch (err) {
        console.warn("[SOS] Geolocation failed:", err);
        setLocStatus("failed");
      }

      const incidentId = await dataService.createIncident({
        risk: "high",
        location: "Manual SOS",
        latitude: loc?.latitude,
        longitude: loc?.longitude,
      });

      if (incidentId) {
        try {
          const payload = await notificationService.notifyGuardians(
            incidentId,
            "Manual SOS",
            "high",
            loc?.latitude,
            loc?.longitude
          );
          if (payload && (payload as any).vapiSuccess) {
            setVapiStatus("success");
          } else {
            setVapiStatus("failed");
          }
        } catch (err) {
          setVapiStatus("failed");
        }

        captureEmergencyEvidence(incidentId)
          .then(() => {
            setEvidenceStatus("success");
            qc.invalidateQueries({ queryKey: ["evidence-items"] });
          })
          .catch(() => setEvidenceStatus("failed"));
      } else {
        setVapiStatus("failed");
        setEvidenceStatus("failed");
      }
    } catch (err) {
      toast.error("SOS pipeline initialization failed.");
      setLocStatus("failed");
      setVapiStatus("failed");
      setEvidenceStatus("failed");
    }
  };

  useEffect(() => {
    if (phase !== "countdown") return;
    timer.current = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(timer.current!);
          executeEmergency();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const cancel = () => {
    clearInterval(timer.current!);
    navigate({ to: "/dashboard" });
  };

  return (
    <PhoneFrame>
      {/* Emergency red is used ONLY here — the app is in an active danger state. */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_oklch(0.72_0.22_25)_0%,_oklch(0.52_0.21_18)_58%,_oklch(0.4_0.16_15)_100%)] px-6 text-center">
        {/* Ambient danger glow layers */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_oklch(0.9_0.15_25/0.25)_0%,_transparent_60%)]"
          animate={{ opacity: [0.35, 0.7, 0.35], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: phase === "countdown" ? 1 : 3, repeat: Infinity, ease: "easeInOut" }}
        />

        <AnimatePresence mode="wait">
          {phase === "countdown" ? (
            <motion.div
              key="countdown"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.35 }}
              className="relative z-10 flex flex-col items-center"
            >
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-danger-foreground/80">
                Sending SOS in
              </p>

              <div className="relative mt-8 grid h-56 w-56 place-items-center">
                <span className="absolute inset-0 rounded-full bg-danger-foreground/15 pulse-ring" />
                <span className="absolute inset-4 rounded-full border-2 border-danger-foreground/25" />
                <motion.span
                  className="absolute inset-0 rounded-full border-[3px] border-danger-foreground/70"
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                />
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={count}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.6, opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="font-display text-[7rem] font-extrabold leading-none text-danger-foreground"
                  >
                    {count}
                  </motion.span>
                </AnimatePresence>
              </div>

              <p className="mt-8 max-w-xs text-sm text-danger-foreground/90">
                Your guardians and live location will be shared automatically. Tap cancel if you're safe.
              </p>

              <Button variant="secondary" size="pill" className="mt-8 w-full max-w-xs" onClick={cancel}>
                <X className="h-5 w-5" /> I'm safe — cancel
              </Button>
            </motion.div>
          ) : (
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
          )}
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