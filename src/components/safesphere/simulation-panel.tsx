import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { ShieldCheck, Siren, ScanSearch, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  simulationStore,
  simulationScenarios,
  simulationThreatMessage,
  useSimulationState,
} from "@/lib/simulation-service";

/**
 * Hidden simulation control for testing.
 *
 * Reveal it with a secret gesture — triple-tap the very top-left corner — or,
 * on desktop preview, press Shift+D.
 */
export function SimulationPanel() {
  const navigate = useNavigate();
  const { panelOpen } = useSimulationState();
  const taps = useRef<number[]>([]);

  // Keyboard shortcut for desktop preview (Shift+D).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (typing) return;
      if (e.shiftKey && (e.key === "D" || e.key === "d")) {
        e.preventDefault();
        simulationStore.togglePanel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const registerTap = () => {
    const now = Date.now();
    taps.current = [...taps.current, now].filter((t) => now - t < 1200);
    if (taps.current.length >= 3) {
      taps.current = [];
      simulationStore.openPanel();
    }
  };

  const runSafe = () => {
    simulationStore.setRoute(simulationScenarios.safe());
    simulationStore.closePanel();
    navigate({ to: "/guardian" });
    toast.success("Simulation · Safe Route loaded");
  };

  const runRisk = () => {
    simulationStore.setRoute(simulationScenarios.risk());
    simulationStore.closePanel();
    navigate({ to: "/guardian" });
    toast.error("Simulation · Risk Route — Guardian alert flow armed 🚨");
  };

  const runThreat = () => {
    simulationStore.setScan(simulationThreatMessage);
    simulationStore.closePanel();
    navigate({ to: "/vault" });
    toast("Simulation · AI Threat message prefilled");
  };

  return (
    <>
      {/* Invisible secret trigger — triple-tap the top-left corner */}
      <button
        aria-hidden
        tabIndex={-1}
        onClick={registerTap}
        className="fixed left-0 top-0 z-[60] h-12 w-12 opacity-0"
      />

      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] grid place-items-end justify-center bg-background/40 pb-6 backdrop-blur-[2px]"
            onClick={() => simulationStore.closePanel()}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[min(24rem,calc(100%-1.5rem))] rounded-[1.6rem] border border-border bg-card p-4 shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-bold">
                  <Sparkles className="h-4 w-4 text-primary" /> Simulation Scenarios
                </p>
                <button
                  onClick={() => simulationStore.closePanel()}
                  aria-label="Close simulation panel"
                  className="grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Testing shortcuts for route risk and alerts.
              </p>

              <div className="mt-3 space-y-2">
                <SimulationButton
                  icon={ShieldCheck}
                  tone="safe"
                  title="Safe Route"
                  sub="Safety score 92 · Low risk"
                  onClick={runSafe}
                />
                <SimulationButton
                  icon={Siren}
                  tone="danger"
                  title="Risk Route"
                  sub="Safety score 28 · High risk · alert flow"
                  onClick={runRisk}
                />
                <SimulationButton
                  icon={ScanSearch}
                  tone="primary"
                  title="AI Threat Scan"
                  sub="Prefill a harmful message example"
                  onClick={runThreat}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function SimulationButton({
  icon: Icon,
  tone,
  title,
  sub,
  onClick,
}: {
  icon: typeof ShieldCheck;
  tone: "safe" | "danger" | "primary";
  title: string;
  sub: string;
  onClick: () => void;
}) {
  const toneClass =
    tone === "danger"
      ? "bg-danger/15 text-danger"
      : tone === "safe"
        ? "bg-safe/15 text-safe-foreground"
        : "bg-primary/15 text-primary";
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left shadow-[var(--shadow-soft)] transition-transform active:scale-[0.98]"
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
      </div>
    </button>
  );
}
