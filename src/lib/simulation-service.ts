// ============================================================================
// SafeSphere · Simulation Scenario Mode
//
// Presentation reliability for the hackathon: a tiny, self-contained store that
// lets a presenter fire predefined, deterministic scenarios regardless of the
// real time-of-day scoring or backend state. It does NOT change any product UI —
// it just pushes fixed "intents" that the Guardian and Shield Hub screens read.
//
// Scenarios:
//   • Safe Journey   — score 92, LOW risk
//   • Risk Journey   — score 28, HIGH risk + Guardian alert flow armed
//   • AI Threat      — prefilled harmful message in the AI scanner
// ============================================================================

import { useSyncExternalStore } from "react";
import { destinations, type DestinationAnalysis } from "./mock-data";
import type { RouteIntelligence } from "./route-intelligence";

export interface RouteSimulation {
  dest: DestinationAnalysis;
  intel: RouteIntelligence;
  /** Auto-arm the Guardian alert flow (high-risk scenario). */
  alert?: boolean;
}

interface SimulationState {
  panelOpen: boolean;
  /** Pending Guardian route scenario, consumed by /guardian. */
  route: RouteSimulation | null;
  /** Pending AI scanner message, consumed by /vault. */
  scanText: string | null;
}

let state: SimulationState = { panelOpen: false, route: null, scanText: null };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}
function set(patch: Partial<SimulationState>) {
  state = { ...state, ...patch };
  emit();
}

export const simulationStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  get: () => state,
  openPanel: () => set({ panelOpen: true }),
  closePanel: () => set({ panelOpen: false }),
  togglePanel: () => set({ panelOpen: !state.panelOpen }),
  setRoute: (route: RouteSimulation | null) => set({ route }),
  setScan: (scanText: string | null) => set({ scanText }),
};

export function useSimulationState(): SimulationState {
  return useSyncExternalStore(simulationStore.subscribe, simulationStore.get, simulationStore.get);
}

// ── Fixed scenario builders (deterministic, time-independent) ────────────────
const safeDest = destinations.find((d) => d.id === "d1")!;
const riskDest = destinations.find((d) => d.id === "d3")!;

export const simulationScenarios = {
  safe: (): RouteSimulation => ({
    dest: safeDest,
    intel: {
      score: 92,
      risk: "low",
      tone: "safe",
      explanation:
        "Active public route with multiple safe zones nearby — Guardian Shield monitoring.",
      factors: safeDest.factors,
    },
  }),
  risk: (): RouteSimulation => ({
    dest: riskDest,
    intel: {
      score: 28,
      risk: "high",
      tone: "danger",
      explanation:
        "Late travel time with reduced public activity detected — no safe zones nearby.",
      factors: riskDest.factors,
    },
    alert: true,
  }),
};

// A clearly harmful example so the AI scanner reliably returns a HIGH threat.
export const simulationThreatMessage =
  "You didn't reply. I know where you live and I'm watching you. Send me the money tonight or I'll share your photos and come find you.";
