// ============================================================================
// SafeSphere · Upgraded Route Intelligence Engine
//
// Calculates route safety dynamically depending on real OSRM and GPS context:
//   1. Night Time Reduction   — Night travel (21:00 - 06:00) reduces score
//   2. Long Route Reduction   — Journeys over 5km reduce score
//   3. GPS Sensor Offline     — GPS issues reduce score
//   4. Route Confidence       — OSRM query failures reduce score
//   5. Guardian Shield Bonus  — Active shield increases safety score
// ============================================================================

import type { RiskLevel, SafetyFactor, FactorStatus } from "./app-data";

export interface RouteInputs {
  hour?: number;
  distance?: number;
  guardianActive: boolean;
  locationAvailable?: boolean;
  routeAvailable?: boolean;
}

export interface RouteIntelligence {
  score: number; // 0–100
  risk: RiskLevel;
  tone: "safe" | "caution" | "danger";
  explanation: string;
  factors: SafetyFactor[];
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function buildExplanation(
  score: number,
  isNight: boolean,
  isLong: boolean,
  locationAvailable: boolean,
  routeAvailable: boolean,
  guardianActive: boolean
): string {
  const factors = [];
  if (isNight) factors.push("night-time transit");
  if (isLong) factors.push("extended route distance");
  if (!locationAvailable) factors.push("unavailable GPS coordinates");
  if (!routeAvailable) factors.push("unconfirmed path confidence");
  if (guardianActive) factors.push("guardian oversight enabled");

  const factorText = factors.length > 0 ? `influenced by ${factors.join(", ")}` : "ideal conditions";
  
  if (score >= 85) {
    return `Context-aware route safety assessment: High safety score (${score}/100) under ${factorText}.`;
  }
  if (score >= 60) {
    return `Context-aware route safety assessment: Moderate safety score (${score}/100) due to ${factorText}.`;
  }
  return `Context-aware route safety assessment: Attention suggested (${score}/100) due to ${factorText}.`;
}

export function computeRouteIntelligence(input: RouteInputs): RouteIntelligence {
  const hour = input.hour ?? new Date().getHours();
  const locationAvailable = input.locationAvailable ?? true;
  const routeAvailable = input.routeAvailable ?? true;
  const distance = input.distance ?? 0;
  
  let score = 100;

  // 1. Night time reduction (-20)
  const isNight = hour >= 21 || hour < 6;
  if (isNight) {
    score -= 20;
  }

  // 2. Long route reduction (-10 if distance > 5km)
  const isLong = distance > 5;
  if (isLong) {
    score -= 10;
  }

  // 3. GPS offline reduction (-15)
  if (!locationAvailable) {
    score -= 15;
  }

  // 4. Route confidence reduction (-10)
  if (!routeAvailable) {
    score -= 10;
  }

  // 5. Guardian Active bonus (+10)
  if (input.guardianActive) {
    score += 10;
  }

  score = clamp(score);

  // Map to Risk level: 85-100 Safe (low), 60-84 Moderate (medium), below 60 Higher Attention (high)
  let risk: RiskLevel = "high";
  let tone: "safe" | "caution" | "danger" = "danger";

  if (score >= 85) {
    risk = "low";
    tone = "safe";
  } else if (score >= 60) {
    risk = "medium";
    tone = "caution";
  }

  const explanation = buildExplanation(
    score,
    isNight,
    isLong,
    locationAvailable,
    routeAvailable,
    input.guardianActive
  );

  const statusFor = (s: number): FactorStatus => {
    return s >= 0 ? "good" : s >= -10 ? "warn" : "bad";
  };

  const factors: SafetyFactor[] = [
    {
      key: "time",
      label: "Time of day",
      value: isNight ? "Night transit (-20)" : "Daylight (0)",
      status: isNight ? "warn" : "good",
      score: isNight ? -20 : 0,
    },
    {
      key: "activity",
      label: "Route distance",
      value: distance > 0 ? `${distance.toFixed(1)} km (${isLong ? "-10" : "0"})` : "Unknown (0)",
      status: isLong ? "warn" : "good",
      score: isLong ? -10 : 0,
    },
    {
      key: "places",
      label: "GPS Signal",
      value: locationAvailable ? "GPS Active (0)" : "Sensor Offline (-15)",
      status: locationAvailable ? "good" : "bad",
      score: locationAvailable ? 0 : -15,
    },
    {
      key: "movement",
      label: "Guardian Shield",
      value: input.guardianActive ? "Shield Active (+10)" : "Shield Inactive (0)",
      status: input.guardianActive ? "good" : "warn",
      score: input.guardianActive ? 10 : 0,
    },
  ];

  return { score, risk, tone, explanation, factors };
}
