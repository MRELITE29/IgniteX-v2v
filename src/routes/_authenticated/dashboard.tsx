import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Navigation, MapPin, LogOut, Home as HomeIcon, Clock, Siren, History, Hourglass, Activity, PhoneCall, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { MobileShell } from "@/components/safesphere/mobile-shell";
import { MapBackground } from "@/components/safesphere/map-background";
import { SafetyMap } from "@/components/safesphere/safety-map";
import { SafetyRing } from "@/components/safesphere/safety-ring";
import { RiskBadge } from "@/components/safesphere/risk-badge";
import { GuardianMonitor } from "@/components/safesphere/guardian-monitor";
import { useAuth } from "@/lib/auth-context";
import { dataService } from "@/lib/data-service";


export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — SafeSphere" }] }),
  component: Dashboard,
});

function Dashboard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [guardian, setGuardian] = useState(true);
  const [gpsStatus, setGpsStatus] = useState<"checking" | "available" | "unavailable">("checking");
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsStatus("unavailable");
      return;
    }
    navigator.permissions.query({ name: "geolocation" }).then((res) => {
      setGpsStatus(res.state === "granted" ? "available" : "unavailable");
      res.onchange = () => {
        setGpsStatus(res.state === "granted" ? "available" : "unavailable");
      };
    }).catch(() => {
      setGpsStatus("available");
    });
  }, []);
  const qc = useQueryClient();
  const { signOut } = useAuth();
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: dataService.getProfile });

  const activeSessionQuery = useQuery({ queryKey: ["active-session"], queryFn: dataService.getActiveSession });
  const activeSession = activeSessionQuery.data;

  const displayName = (profileQuery.data?.fullName || "User").split(" ")[0];
  const initials =
    (profileQuery.data?.fullName || "User")
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <MobileShell padded={false}>
      <div className="relative flex-1 min-h-[620px]">
        {guardian && activeSession?.latitude && activeSession?.longitude ? (
          <div className="absolute inset-0 w-full h-full">
            <SafetyMap
              latitude={activeSession.latitude}
              longitude={activeSession.longitude}
              risk={activeSession.risk}
              guardianActive={true}
              message={`Active Journey: ${activeSession.destination}`}
            />
          </div>
        ) : (
          <>
            <MapBackground route={guardian} tone="safe" />

            {/* Live location marker with sharing-style rings */}
            <div className="pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2">
              <div className="relative grid h-4 w-4 place-items-center">
                <span className="absolute h-4 w-4 rounded-full bg-primary shadow-[var(--shadow-glow)]" />
                <span className="absolute h-12 w-12 rounded-full border border-primary/40 pulse-ring" />
                <span className="absolute h-12 w-12 rounded-full border border-primary/30 pulse-ring [animation-delay:1.2s]" />
              </div>
            </div>
          </>
        )}

        {/* Top status bar */}
        <div className="absolute inset-x-0 top-0 px-5 pt-7">
          <div className="bg-card border border-border shadow-[var(--shadow-soft)] flex items-center gap-3 rounded-[1.6rem] p-3">
            <Link to="/profile" className="grid h-11 w-11 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {initials}
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight">Hi, {displayName} 👋</p>
              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {profileQuery.data?.address || "Location not set"} · GPS {gpsStatus === "available" ? "available" : "unavailable"}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              className="grid h-10 w-10 place-items-center rounded-full bg-card text-foreground shadow-[var(--shadow-soft)] transition-colors hover:text-danger"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>

        </div>

        {/* Bottom expandable drawer card */}
        <motion.div
          initial="collapsed"
          animate={isExpanded ? "expanded" : "collapsed"}
          variants={{
            expanded: { y: "0%" },
            collapsed: { y: "calc(100% - 110px)" }
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-card/95 backdrop-blur-xl border-t border-border shadow-2xl absolute inset-x-0 bottom-0 rounded-t-[2.25rem] p-5 pt-2 pointer-events-auto z-20 flex flex-col"
          style={{ height: "75vh" }}
        >
          {/* Handle */}
          <div 
            className="w-full pb-4 pt-2 flex justify-center shrink-0 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pb-6 flex flex-col gap-5">
            {/* Guardian status header */}
            <div className="flex items-center justify-between cursor-pointer" onClick={() => !isExpanded && setIsExpanded(true)}>
              <div className="flex items-center gap-3">
                <span
                  className={`grid h-11 w-11 place-items-center rounded-2xl transition-all ${
                    guardian ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <ShieldCheck className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-base font-bold leading-tight">
                    Guardian {guardian ? "Active" : "Off"} {guardian && "🛡️"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {guardian ? "Monitoring your journey" : "Tap to protect yourself"}
                  </p>
                </div>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <Switch
                  checked={guardian}
                  onCheckedChange={(v) => {
                    setGuardian(v);
                    if (v) setIsExpanded(true);
                    toast(v ? "Guardian Shield activated 🛡️" : "Guardian Shield paused");
                  }}
                />
              </div>
            </div>

            {/* Safety ring + journey stats */}
            <div className="flex flex-col md:flex-row items-center gap-5">
              <div className="mx-auto shrink-0">
                <SafetyRing score={guardian && activeSession ? activeSession.safetyScore : 0} size={140} strokeWidth={12} tone="safe" />
              </div>
              <div className="flex-1 w-full space-y-2">
                <RiskBadge risk={guardian && activeSession ? activeSession.risk : "low"} />
                <InfoRow icon={HomeIcon} label="Destination" value={activeSession ? activeSession.destination : "Not active"} />
                <InfoRow icon={Clock} label="ETA" value={activeSession ? (activeSession.etaMinutes + " min") : "--"} />
                <InfoRow 
                  icon={History} 
                  label="Last Check" 
                  value={activeSession?.lastGuardianCheck ? new Date(activeSession.lastGuardianCheck).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "--"} 
                />
                <InfoRow 
                  icon={Hourglass} 
                  label="Next Check" 
                  value={activeSession?.nextGuardianCheck ? new Date(activeSession.nextGuardianCheck).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "--"} 
                />
                <InfoRow 
                  icon={Activity} 
                  label="Journey Status" 
                  value={activeSession?.currentJourneyStatus === "protocol" ? "Emergency" : activeSession?.currentJourneyStatus === "confirm" ? "Checking" : "Monitoring"} 
                />
                <InfoRow 
                  icon={PhoneCall} 
                  label="Guardian Status" 
                  value={activeSession?.guardianStatus === "success" ? "Notified" : activeSession?.guardianStatus === "failed" ? "Failed" : activeSession?.guardianStatus === "loading" ? "Dispatching" : "Idle"} 
                />
                <InfoRow 
                  icon={Video} 
                  label="Evidence Status" 
                  value={activeSession?.evidenceStatus === "success" ? "Vaulted" : activeSession?.evidenceStatus === "failed" ? "Failed" : activeSession?.evidenceStatus === "loading" ? "Recording" : "Idle"} 
                />
              </div>
            </div>

            {/* Guardian Shield monitoring → confirmation → emergency protocol flow */}
            <GuardianMonitor active={guardian} />

            {/* Action buttons */}
            <div className="mt-auto pt-2 space-y-2.5">
              <Button
                asChild={guardian}
                variant="hero"
                size="pill"
                className="w-full"
                onClick={guardian ? undefined : () => {
                  setGuardian(true);
                  setIsExpanded(true);
                  toast("Guardian Shield activated 🛡️");
                }}
              >
                {guardian ? (
                  <Link to="/guardian">
                    <Navigation className="h-5 w-5" /> View live journey
                  </Link>
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5" /> Activate Guardian Shield
                  </>
                )}
              </Button>
              <Button asChild variant="danger" size="pill" className="w-full">
                <Link to="/sos">
                  <Siren className="h-5 w-5" /> Emergency SOS
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </MobileShell>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof HomeIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-card/70 px-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="ml-auto text-sm font-bold">{value}</span>
    </div>
  );
}