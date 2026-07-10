import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { ShieldCheck, ShieldAlert, Activity, Check, MapPin, Users, Lock, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { emergencyProtocol } from "@/lib/app-data";
import { dataService } from "@/lib/data-service";
import {
  requestGuardianPermissions,
  queryPermission,
  type PermissionStatus,
} from "@/lib/permission-service";
import { useQueryClient } from "@tanstack/react-query";
import { locationService } from "@/lib/location-service";
import { executeEmergencyProtocol } from "@/lib/emergency-protocol";
import { computeRouteIntelligence } from "@/lib/route-intelligence";

/**
 * Guardian Shield emergency flow:
 *
 * 1. "monitoring"  — Shield is active; location + microphone permissions requested
 *                    on first activation (only if not yet granted).
 * 2. "confirm"     — Unusual activity detected; user has CONFIRM_SECONDS to
 *                    confirm safety. Countdown shown.
 * 3. "protocol"    — No response → incident created; guardian notification and
 *                    evidence capture stubs fire (TODO: real integrations).
 */
type Phase = "monitoring" | "confirm" | "protocol";

const CONFIRM_SECONDS = 15;
const CHECK_INTERVAL = 120000; // 2 minutes (routine check)
const ENGINE_INTERVAL = 10000; // 10 seconds (continuous health engine)

export function GuardianMonitor({ active }: { active: boolean }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [phase, setPhase] = useState<Phase>("monitoring");
  const [count, setCount] = useState(CONFIRM_SECONDS);
  const [locStatus, setLocStatus] = useState<"idle" | "loading" | "success" | "failed">("idle");
  const [vapiStatus, setVapiStatus] = useState<"idle" | "loading" | "success" | "failed">("idle");
  const [evidenceStatus, setEvidenceStatus] = useState<"idle" | "loading" | "success" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const engineTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Permission state — queried once on mount, re-queried when shield activates.
  const [locationPerm, setLocationPerm] = useState<PermissionStatus>("unknown");
  const [micPerm, setMicPerm] = useState<PermissionStatus>("unknown");
  const [camPerm, setCamPerm] = useState<PermissionStatus>("unknown");
  const [notifPerm, setNotifPerm] = useState<PermissionStatus>("unknown");
  const [requestingPerms, setRequestingPerms] = useState(false);

  // ── On shield activation: request permissions contextually ────────────────
  useEffect(() => {
    setPhase("monitoring");
    setCount(CONFIRM_SECONDS);
    setLocStatus("idle");
    setVapiStatus("idle");
    setEvidenceStatus("idle");

    if (!active) return;
    
    // Start continuous 2-minute checks
    checkTimer.current = setInterval(() => {
      detectRisk();
    }, CHECK_INTERVAL);

    // Check current status before prompting.
    void (async () => {
      const [loc, mic, cam, notif] = await Promise.all([
        queryPermission("location"),
        queryPermission("microphone"),
        queryPermission("camera"),
        queryPermission("notifications"),
      ]);
      setLocationPerm(loc);
      setMicPerm(mic);
      setCamPerm(cam);
      setNotifPerm(notif);

      // Only request if any of them is not granted.
      if (loc !== "granted" || mic !== "granted" || cam !== "granted" || notif !== "granted") {
        setRequestingPerms(true);
        const result = await requestGuardianPermissions();
        setLocationPerm(result.location.status);
        setMicPerm(result.microphone.status);
        setCamPerm(result.camera.status);
        setNotifPerm(result.notifications.status);
        setRequestingPerms(false);

        if (result.location.status === "denied") {
          toast.warning(result.location.deniedMessage ?? "Location access denied");
        }
        if (result.microphone.status === "denied") {
          toast.warning(result.microphone.deniedMessage ?? "Microphone access denied");
        }
        if (result.camera.status === "denied") {
          toast.warning(result.camera.deniedMessage ?? "Camera access denied");
        }
        if (result.notifications.status === "denied") {
          toast.warning(result.notifications.deniedMessage ?? "Notifications denied");
        }
      }
    })();
    
    // Start continuous 10-second Journey Engine
    engineTimer.current = setInterval(async () => {
      // Only run engine if monitoring
      if (phase !== "monitoring") return;

      let loc = null;
      try {
        loc = await locationService.getCurrentLocation();
      } catch (err) {
        // GPS unavailable
        detectRisk("GPS signal lost. Are you safe?");
        return;
      }

      const session = qc.getQueryData<any>(["active-session"]);
      if (!session) return; // No active journey

      // 1. Check ETA tolerance (e.g. 5 mins over ETA)
      // Assuming session was created recently; we'll use a mock creation time if missing.
      const startTime = session.created_at ? new Date(session.created_at).getTime() : Date.now() - (session.etaMinutes * 60000);
      const elapsedMs = Date.now() - startTime;
      const etaMs = (session.etaMinutes || 0) * 60000;
      const toleranceMs = 5 * 60000;

      if (elapsedMs > etaMs + toleranceMs) {
        detectRisk("Journey taking longer than expected. Are you safe?");
        return;
      }

      // 2. Recalculate safety score
      const result = computeRouteIntelligence({
        hour: new Date().getHours(),
        distance: session.distanceKm || 2, // approximation if not tracked live
        guardianActive: true,
        locationAvailable: true,
        routeAvailable: true,
      });

      if (result.score < 40) {
        detectRisk("High risk conditions detected. Are you safe?");
        return;
      }

      // 3. Update dashboard cache with rich telemetry
      qc.setQueryData(["active-session"], {
        ...session,
        safetyScore: result.score,
        risk: result.risk,
        lastGuardianCheck: Date.now(),
        nextGuardianCheck: Date.now() + CHECK_INTERVAL,
        currentJourneyStatus: phase,
        evidenceStatus,
        guardianStatus: vapiStatus,
      });
    }, ENGINE_INTERVAL);

    return () => {
      if (checkTimer.current) clearInterval(checkTimer.current);
      if (engineTimer.current) clearInterval(engineTimer.current);
    };
  }, [active, phase]);

  // ── Countdown while awaiting user confirmation ────────────────────────────
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

  const detectRisk = (msg?: string) => {
    if (checkTimer.current) clearInterval(checkTimer.current);
    setCount(CONFIRM_SECONDS);
    setPhase("confirm");
    toast(msg ?? "Safety check: please confirm you're safe");
    
    // Sync phase to dashboard
    qc.setQueryData(["active-session"], (old: any) => old ? { ...old, currentJourneyStatus: "confirm" } : old);
  };

  const confirmSafe = () => {
    if (timer.current) clearInterval(timer.current);
    setPhase("monitoring");
    setCount(CONFIRM_SECONDS);
    setLocStatus("idle");
    setVapiStatus("idle");
    setEvidenceStatus("idle");
    toast.success("Marked safe — Guardian Shield keeps monitoring 💚");
    
    // Sync phase to dashboard
    qc.setQueryData(["active-session"], (old: any) => old ? { ...old, currentJourneyStatus: "monitoring" } : old);
    
    // Restart continuous checks
    checkTimer.current = setInterval(() => {
      detectRisk();
    }, CHECK_INTERVAL);
  };

  const escalate = async () => {
    if (timer.current) clearInterval(timer.current);
    if (checkTimer.current) clearInterval(checkTimer.current);
    if (engineTimer.current) clearInterval(engineTimer.current);
    setPhase("protocol");
    
    // Sync phase to dashboard
    qc.setQueryData(["active-session"], (old: any) => old ? { ...old, currentJourneyStatus: "protocol" } : old);
    
    toast.error("No response — Emergency Protocol activated 🚨");

    executeEmergencyProtocol(
      qc,
      (state) => {
        if (state.locStatus) setLocStatus(state.locStatus);
        if (state.vapiStatus) setVapiStatus(state.vapiStatus);
        if (state.evidenceStatus) setEvidenceStatus(state.evidenceStatus);
        
        // Sync these states to the dashboard dynamically
        qc.setQueryData(["active-session"], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            ...(state.vapiStatus && { guardianStatus: state.vapiStatus }),
            ...(state.evidenceStatus && { evidenceStatus: state.evidenceStatus }),
          };
        });
      },
      "Live route"
    );
  };

  if (!active) return null;

  // ── Permission warning banner ─────────────────────────────────────────────
  const permDenied = locationPerm === "denied" || micPerm === "denied";

  return (
    <>
      {/* Permission request in progress */}
      {requestingPerms && (
        <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-muted/60 px-3 py-2.5">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Requesting location & microphone…</span>
        </div>
      )}

      {/* Permission denied warning */}
      {!requestingPerms && permDenied && (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-caution/40 bg-caution/10 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-caution-foreground" />
          <p className="text-xs text-muted-foreground">
            {locationPerm === "denied" && "Location access denied. "}
            {micPerm === "denied" && "Microphone access denied. "}
            Guardian Shield is limited — enable permissions in browser settings.
          </p>
        </div>
      )}

      {/* Monitoring status + simulation trigger */}
      {!requestingPerms && (
        <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-primary/10 px-3 py-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary pulse-ring" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Activity className="h-3.5 w-3.5 text-primary" />
            {locationPerm === "granted" ? "Monitoring with live location" : "Safety monitoring active"}
          </span>
          <button
            onClick={detectRisk}
            className="ml-auto rounded-full bg-card px-2.5 py-1 text-[10px] font-bold text-muted-foreground shadow-[var(--shadow-soft)] transition-colors hover:text-foreground"
          >
            Simulate safety check
          </button>
        </div>
      )}

      {/* Confirmation + Emergency Protocol overlay */}
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
                  Guardian Shield check. Confirm within{" "}
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
                  {emergencyProtocol.map((step, i) => {
                    let status = "idle" as any;
                    if (i === 0) status = locStatus;
                    if (i === 1) status = vapiStatus;
                    if (i === 2) status = evidenceStatus;
                    
                    return (
                      <ProtocolRow
                        key={step.title}
                        index={i}
                        title={step.title}
                        sub={step.sub}
                        status={status}
                      />
                    );
                  })}
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

function ProtocolRow({
  index,
  title,
  sub,
  status,
}: {
  index: number;
  title: string;
  sub: string;
  status: "idle" | "loading" | "success" | "failed";
}) {
  const Icon = protocolIcon[index] ?? MapPin;

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-muted/50 p-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-danger/10 text-danger">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {index === 1 && status === "failed" ? "Call dispatch failed" : sub}
        </p>
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
            className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-muted border-t-danger"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
