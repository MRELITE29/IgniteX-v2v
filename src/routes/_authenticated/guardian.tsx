import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  Navigation,
  MapPin,
  Search,
  Loader2,
  Check,
  AlertTriangle,
  Siren,
  ShieldCheck,
  Clock,
  Route as RouteIcon,
  Users,
  Sun,
  Footprints,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MobileShell } from "@/components/safesphere/mobile-shell";
import { MapBackground } from "@/components/safesphere/map-background";
import { SafetyRing } from "@/components/safesphere/safety-ring";
import { RiskBadge } from "@/components/safesphere/risk-badge";
import { destinations, type DestinationAnalysis, type SafetyFactor } from "@/lib/mock-data";
import { computeRouteIntelligence, type RouteIntelligence } from "@/lib/route-intelligence";
import { dataService } from "@/lib/data-service";
import { simulationStore, useSimulationState } from "@/lib/simulation-service";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/guardian")({
  head: () => ({ meta: [{ title: "Guardian Shield — SafeSphere" }] }),
  component: Guardian,
});

type Step = "input" | "analyzing" | "result";

const factorIcon: Record<SafetyFactor["key"], typeof Users> = {
  places: Users,
  time: Sun,
  activity: RouteIcon,
  movement: Footprints,
};

function Guardian() {
  const [step, setStep] = useState<Step>("input");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DestinationAnalysis | null>(null);
  const [intel, setIntel] = useState<RouteIntelligence | null>(null);
  const [autoAlert, setAutoAlert] = useState(false);
  const demo = useSimulationState();

  // Hidden simulation scenario: jump straight to a deterministic result.
  useEffect(() => {
    const r = demo.route;
    if (!r) return;
    setSelected(r.dest);
    setIntel(r.intel);
    setQuery(r.dest.name);
    setAutoAlert(!!r.alert);
    setStep("result");
    void dataService.startSession({
      destination: r.dest.name,
      startLocation: r.dest.address,
      safetyScore: r.intel.score,
      risk: r.intel.risk,
      explanation: r.intel.explanation,
    });
    simulationStore.setRoute(null);
  }, [demo.route]);

  const analyze = (dest: DestinationAnalysis) => {
    setSelected(dest);
    setQuery(dest.name);
    setStep("analyzing");
    // Route Intelligence Engine — dynamic score from time, activity,
    // safe zones and Guardian Shield status.
    const result = computeRouteIntelligence(dest.inputs);
    setIntel(result);
    // Persist the calculated journey (no-op in simulation mode / signed-out).
    void dataService.startSession({
      destination: dest.name,
      startLocation: dest.address,
      safetyScore: result.score,
      risk: result.risk,
      explanation: result.explanation,
    });
    setTimeout(() => setStep("result"), 1600);
  };

  const reset = () => {
    setStep("input");
    setSelected(null);
    setIntel(null);
    setQuery("");
    setAutoAlert(false);
  };

  return (
    <MobileShell padded={false}>
      <div className="relative flex-1 min-h-[620px]">
        <MapBackground route={step === "result"} tone={intel?.tone ?? selected?.tone ?? "safe"} />

        <AnimatePresence mode="wait">
          {step === "input" && (
            <DestinationInput key="input" query={query} setQuery={setQuery} onPick={analyze} />
          )}
          {step === "analyzing" && <Analyzing key="analyzing" dest={selected!} />}
          {step === "result" && (
            <ResultView key="result" dest={selected!} intel={intel!} autoAlert={autoAlert} onBack={reset} />
          )}
        </AnimatePresence>
      </div>
    </MobileShell>
  );
}

/* ── Step 1 · destination entry ─────────────────────────────── */
function DestinationInput({
  query,
  setQuery,
  onPick,
}: {
  query: string;
  setQuery: (v: string) => void;
  onPick: (d: DestinationAnalysis) => void;
}) {
  const results = query.trim()
    ? destinations.filter((d) =>
        (d.name + d.address).toLowerCase().includes(query.trim().toLowerCase()),
      )
    : destinations;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="absolute inset-x-4 top-7 bottom-24 flex flex-col"
    >
      <div className="bg-card border border-border shadow-[var(--shadow-soft)] rounded-[2rem] p-5">
        <div className="mb-1 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-base font-bold leading-tight">Guardian Shield</p>
            <p className="text-xs text-muted-foreground">Where are you heading?</p>
          </div>
        </div>

        <div className="relative mt-4">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter destination"
            className="h-12 rounded-2xl border-transparent bg-card pl-10 text-sm font-medium shadow-[var(--shadow-soft)]"
          />
        </div>
      </div>

      <div className="mt-3 flex-1 overflow-y-auto">
        <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {query.trim() ? "Matches" : "Recent & suggested"}
        </p>
        <div className="space-y-2">
          {results.map((d) => (
            <button
              key={d.id}
              onClick={() => onPick(d)}
              className="bg-card border border-border shadow-[var(--shadow-soft)] flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-transform active:scale-[0.98]"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                <MapPin className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{d.name}</p>
                <p className="truncate text-xs text-muted-foreground">{d.address}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          ))}
          {results.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">No matches found.</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Step 2 · analyzing ─────────────────────────────────────── */
function Analyzing({ dest }: { dest: DestinationAnalysis }) {
  const lines = ["Nearby public places", "Time of day", "Route activity", "Movement pattern"];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 grid place-items-center px-8"
    >
      <div className="bg-card border border-border shadow-[var(--shadow-soft)] w-full rounded-[2rem] p-7 text-center">
        <div className="relative mx-auto grid h-20 w-20 place-items-center">
          <span className="absolute inset-0 rounded-full border-2 border-primary/40 pulse-ring" />
          <span className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
            <Loader2 className="h-7 w-7 animate-spin" />
          </span>
        </div>
        <p className="mt-5 text-base font-bold">Analyzing your route</p>
        <p className="text-xs text-muted-foreground">to {dest.name}</p>
        <div className="mt-5 space-y-2 text-left">
          {lines.map((l, i) => (
            <motion.div
              key={l}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.32 }}
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground"
            >
              <Check className="h-3.5 w-3.5 text-primary" /> {l}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Step 3 · result + Route Intelligence Engine ───────────── */
function ResultView({
  dest,
  intel,
  autoAlert,
  onBack,
}: {
  dest: DestinationAnalysis;
  intel: RouteIntelligence;
  autoAlert?: boolean;
  onBack: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [alertMode, setAlertMode] = useState(!!autoAlert);

  // Simulation scenario: high-risk journey arrives with the Guardian alert flow armed.
  useEffect(() => {
    if (!autoAlert) return;
    toast.error("Alert mode enabled — guardians are watching 🚨");
    dataService.createIncident({ risk: "high", location: dest.name }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      key="result"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      className="absolute inset-0 flex flex-col"
    >
      {/* header */}
      <div className="flex items-center gap-2 px-5 pt-7">
        <button
          onClick={onBack}
          aria-label="Change destination"
          className="bg-card border border-border shadow-[var(--shadow-soft)] grid h-10 w-10 place-items-center rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="bg-card border border-border shadow-[var(--shadow-soft)] flex min-w-0 flex-1 items-center gap-2 rounded-full px-4 py-2.5">
          <Navigation className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate text-sm font-bold">{dest.name}</span>
        </div>
      </div>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto px-5 pb-28">
        {/* score + route preview */}
        <div className="bg-card border border-border shadow-[var(--shadow-soft)] rounded-[2rem] p-5">
          <div className="flex items-center gap-4">
            <SafetyRing score={intel.score} size={120} strokeWidth={12} tone={intel.tone} />
            <div className="flex-1 space-y-2">
              <RiskBadge risk={intel.risk} />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> ETA {dest.etaMinutes} min
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <RouteIcon className="h-3.5 w-3.5" /> {dest.distanceKm} km route preview
              </div>
            </div>
          </div>
          <p className="mt-4 rounded-2xl bg-card/70 p-3 text-xs font-medium text-foreground">
            {intel.explanation}
          </p>
        </div>

        {/* Safety Intelligence Engine */}
        <div className="bg-card border border-border shadow-[var(--shadow-soft)] rounded-[1.6rem] p-4">
          <p className="mb-1 flex items-center gap-2 text-sm font-bold">
            <ShieldCheck className="h-4 w-4 text-primary" /> Route Intelligence Engine
          </p>
          <p className="mb-3 text-xs text-muted-foreground">Live factors scoring this route</p>
          <div className="space-y-3">
            {intel.factors.map((f) => (
              <FactorRow key={f.key} factor={f} />
            ))}
          </div>
        </div>

        {/* Reasons */}
        <div className="bg-card border border-border shadow-[var(--shadow-soft)] rounded-[1.6rem] p-4">
          <p className="mb-3 text-sm font-bold">Why this score</p>
          <div className="space-y-2.5">
            {dest.reasons.map((r) => (
              <div key={r} className="flex items-center gap-2.5 text-sm">
                <span
                  className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full",
                    intel.tone === "safe" && "bg-safe/15 text-safe-foreground",
                    intel.tone === "caution" && "bg-caution/20 text-caution-foreground",
                    intel.tone === "danger" && "bg-danger/15 text-danger",
                  )}
                >
                  {intel.tone === "safe" ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.6} />
                  )}
                </span>
                <span className="font-medium">{r}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk-based action zone */}
        {intel.risk === "low" && (
          <Button
            variant="hero"
            size="pill"
            className="w-full"
            onClick={() => toast.success("Guardian Shield engaged — monitoring your journey 💚")}
          >
            <ShieldCheck className="h-5 w-5" /> Start Guardian Shield
          </Button>
        )}

        {intel.risk === "medium" && (
          <div className="rounded-[1.6rem] border border-caution/40 bg-caution/15 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-caution-foreground">
              <AlertTriangle className="h-4 w-4" /> This route has some risk
            </p>
            <p className="mt-1 text-xs text-caution-foreground/80">
              We recommend a safer path. Continue only if you're sure.
            </p>
            <div className="mt-3 space-y-2">
              <Button
                variant="hero"
                size="pill"
                className="w-full"
                onClick={() => {
                  onBack();
                  toast("Finding a safer route for you…");
                }}
              >
                <RouteIcon className="h-5 w-5" /> Choose safer route
              </Button>
              {confirmed ? (
                <Button
                  size="pill"
                  variant="secondary"
                  className="w-full"
                  onClick={() =>
                    toast.success("Guardian Shield engaged with extra check-ins 🛡️")
                  }
                >
                  <ShieldCheck className="h-5 w-5" /> Proceed with monitoring
                </Button>
              ) : (
                <Button
                  size="pill"
                  variant="secondary"
                  className="w-full"
                  onClick={() => setConfirmed(true)}
                >
                  Proceed anyway
                </Button>
              )}
            </div>
          </div>
        )}

        {intel.risk === "high" && (
          <div
            className={cn(
              "rounded-[1.6rem] border p-4 transition-colors",
              alertMode
                ? "border-danger bg-danger/20"
                : "border-danger/40 bg-danger/10",
            )}
          >
            <p className="flex items-center gap-2 text-sm font-bold text-danger">
              <Siren className="h-4 w-4" /> High risk detected
            </p>
            <p className="mt-1 text-xs text-danger/80">
              This route is unsafe right now. Alert mode arms live tracking, audio
              capture and one-tap SOS.
            </p>
            <div className="mt-3 space-y-2">
              {alertMode ? (
                <>
                  <div className="flex items-center gap-2 rounded-2xl bg-danger/15 px-3 py-2 text-xs font-semibold text-danger">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-danger pulse-ring" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger" />
                    </span>
                    Alert mode active — guardians notified
                  </div>
                  <Button asChild variant="danger" size="pill" className="w-full">
                    <Link to="/sos">
                      <Siren className="h-5 w-5" /> Emergency SOS
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="danger"
                    size="pill"
                    className="w-full"
                    onClick={() => {
                      setAlertMode(true);
                      toast.error("Alert mode enabled — guardians are watching 🚨");
                    }}
                  >
                    <Siren className="h-5 w-5" /> Enable alert mode
                  </Button>
                  <Button
                    size="pill"
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      onBack();
                      toast("Let's find a safer route.");
                    }}
                  >
                    <RouteIcon className="h-5 w-5" /> Choose safer route
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function FactorRow({ factor }: { factor: SafetyFactor }) {
  const Icon = factorIcon[factor.key];
  const barColor =
    factor.status === "good"
      ? "var(--safe)"
      : factor.status === "warn"
        ? "var(--caution)"
        : "var(--danger)";
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
          factor.status === "good" && "bg-safe/15 text-safe-foreground",
          factor.status === "warn" && "bg-caution/20 text-caution-foreground",
          factor.status === "bad" && "bg-danger/15 text-danger",
        )}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">{factor.label}</span>
          <span className="text-muted-foreground">{factor.value}</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: barColor }}
            initial={{ width: 0 }}
            animate={{ width: `${factor.score}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}
