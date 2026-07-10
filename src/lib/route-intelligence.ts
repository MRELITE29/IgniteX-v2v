// ============================================================================
// SafeSphere · Route Intelligence Engine
//
// Pure, dependency-free safety scoring. Replaces static route safety values
// with a dynamic calculation driven by four inputs:
//   1. Time Analysis        — daytime is safer, late night raises risk
//   2. Area Activity        — high / medium / low public activity
//   3. Safe Zone Availability — nearby hospitals, police, stores, public places
//   4. Guardian Shield Status — active monitoring improves protection
//
// Output: a 0–100 safety score, a LOW/MEDIUM/HIGH risk level, a short
// human-readable explanation, and the per-factor breakdown the UI renders.
// ============================================================================

import type { RiskLevel, SafetyFactor, FactorStatus } from "./app-data";

export type AreaActivity = "high" | "medium" | "low";

export interface SafeZones {
  hospitals: number;
  police: number;
  stores: number;
  publicPlaces: number;
}

export interface RouteInputs {
  /** Local hour of travel, 0–23. Defaults to now when omitted. */
  hour?: number;
  areaActivity: AreaActivity;
  safeZones: SafeZones;
  /** Guardian Shield actively monitoring this journey. */
  guardianActive: boolean;
}

export interface RouteIntelligence {
  score: number; // 0–100
  risk: RiskLevel;
  tone: "safe" | "caution" | "danger";
  explanation: string;
  factors: SafetyFactor[];
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function statusFor(score: number): FactorStatus {
  return score >= 70 ? "good" : score >= 45 ? "warn" : "bad";
}

// ── 1 · Time analysis ────────────────────────────────────────────────────────
function timeAnalysis(hour: number): { score: number; value: string; phrase: string } {
  const h = ((hour % 24) + 24) % 24;
  const label = new Date(0, 0, 0, h).toLocaleTimeString([], { hour: "numeric" });
  if (h >= 6 && h < 17)
    return { score: 92, value: `${label} · daylight hours`, phrase: "active daytime travel" };
  if (h >= 17 && h < 21)
    return { score: 72, value: `${label} · evening`, phrase: "evening travel window" };
  if (h >= 21 && h < 23)
    return { score: 45, value: `${label} · late evening`, phrase: "late-evening travel" };
  return { score: 18, value: `${label} · late night`, phrase: "late travel time" };
}

// ── 2 · Area activity ────────────────────────────────────────────────────────
function activityAnalysis(a: AreaActivity): { score: number; value: string; phrase: string } {
  if (a === "high") return { score: 94, value: "High foot traffic", phrase: "high public activity" };
  if (a === "medium") return { score: 55, value: "Moderate foot traffic", phrase: "moderate area activity" };
  return { score: 22, value: "Low foot traffic", phrase: "reduced public activity" };
}

// ── 3 · Safe zone availability ───────────────────────────────────────────────
function zoneAnalysis(z: SafeZones): { score: number; value: string; phrase: string; count: number } {
  const count = z.hospitals + z.police + z.stores + z.publicPlaces;
  // Emergency services (hospitals, police) weigh more than convenience places.
  const raw = z.hospitals * 26 + z.police * 28 + z.stores * 13 + z.publicPlaces * 11;
  const score = clamp(raw);
  const value = count === 0 ? "None within 500m" : `${count} within 500m`;
  const phrase =
    count >= 4
      ? "multiple safe zones nearby"
      : count >= 1
        ? "a few safe zones nearby"
        : "no safe zones nearby";
  return { score, value, phrase, count };
}

// ── 4 · Guardian Shield status ───────────────────────────────────────────────
function guardianAnalysis(active: boolean): { score: number; value: string } {
  return active
    ? { score: 90, value: "Active monitoring" }
    : { score: 38, value: "Not monitoring" };
}

// ── Explanation builder ──────────────────────────────────────────────────────
function buildExplanation(
  risk: RiskLevel,
  time: { phrase: string },
  activity: { phrase: string },
  zones: { phrase: string },
  guardianActive: boolean,
): string {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  if (risk === "low") {
    const guard = guardianActive ? ", Guardian Shield monitoring" : "";
    return `Active public route with ${zones.phrase}${guard}.`;
  }
  if (risk === "medium") {
    return `${cap(time.phrase)} with ${activity.phrase} — ${zones.phrase}.`;
  }
  return `${cap(time.phrase)} with ${activity.phrase} detected — ${zones.phrase}.`;
}

// ── Engine ───────────────────────────────────────────────────────────────────
export function computeRouteIntelligence(input: RouteInputs): RouteIntelligence {
  const hour = input.hour ?? new Date().getHours();
  const time = timeAnalysis(hour);
  const activity = activityAnalysis(input.areaActivity);
  const zones = zoneAnalysis(input.safeZones);
  const guardian = guardianAnalysis(input.guardianActive);

  // Weighted blend of the four signals.
  const score = clamp(
    time.score * 0.3 + activity.score * 0.28 + zones.score * 0.27 + guardian.score * 0.15,
  );

  const risk: RiskLevel = score >= 75 ? "low" : score >= 45 ? "medium" : "high";
  const tone = risk === "low" ? "safe" : risk === "medium" ? "caution" : "danger";
  const explanation = buildExplanation(risk, time, activity, zones, input.guardianActive);

  const factors: SafetyFactor[] = [
    { key: "places", label: "Nearby public places", value: zones.value, status: statusFor(zones.score), score: zones.score },
    { key: "time", label: "Time of day", value: time.value, status: statusFor(time.score), score: time.score },
    { key: "activity", label: "Area activity", value: activity.value, status: statusFor(activity.score), score: activity.score },
    { key: "movement", label: "Guardian Shield", value: guardian.value, status: statusFor(guardian.score), score: guardian.score },
  ];

  return { score, risk, tone, explanation, factors };
}
