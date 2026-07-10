// ============================================================================
// SafeSphere frontend state — SIMULATION DATA
//
// This file contains types and simulation data for route intelligence
// and fallback features. All fake personal user data has been removed.
// ============================================================================

export type RiskLevel = "low" | "medium" | "high";

import type { RouteInputs } from "./route-intelligence";

export interface Contact {
  id: string;
  name: string;
  relation: string;
  phone: string;
  initials: string;
  primary?: boolean;
}

export interface SafePlace {
  id: string;
  name: string;
  type: "hospital" | "police" | "store" | "cafe" | "transit";
  distance: string;
  open: boolean;
}

export interface ActivityItem {
  id: string;
  title: string;
  detail: string;
  time: string;
  tone: "safe" | "info" | "alert";
}

export interface EvidenceItem {
  id: string;
  type: "audio" | "video" | "photo" | "location" | "report";
  title: string;
  time: string;
  location: string;
  size: string;
  locked: boolean;
}

export interface ScanResult {
  id: string;
  message: string;
  threat: RiskLevel;
  risk: number;
  action: string;
  time: string;
  explanation?: string;
  categories?: string[];
}

export const safePlaces: SafePlace[] = [
  { id: "p1", name: "City Care Hospital", type: "hospital", distance: "220 m", open: true },
  { id: "p2", name: "MG Road Police Post", type: "police", distance: "400 m", open: true },
  { id: "p3", name: "24/7 Metro Mart", type: "store", distance: "150 m", open: true },
  { id: "p4", name: "Brew & Co Cafe", type: "cafe", distance: "320 m", open: true },
  { id: "p5", name: "Central Metro Station", type: "transit", distance: "500 m", open: true },
];

export function analyzeMessage(text: string): Omit<ScanResult, "id" | "time"> {
  const t = text.toLowerCase();
  const highWords = ["kill", "follow", "know where", "come out", "or i'll", "threat", "hurt", "share the", "watching", "die"];
  const medWords = ["urgent", "money", "send", "alone", "meet now", "don't tell", "secret"];
  let risk = 6;
  for (const w of highWords) if (t.includes(w)) risk += 32;
  for (const w of medWords) if (t.includes(w)) risk += 14;
  risk = Math.min(risk, 98);
  const threat: RiskLevel = risk >= 65 ? "high" : risk >= 30 ? "medium" : "low";
  const action =
    threat === "high"
      ? "High threat. Do not engage — save evidence and alert a guardian now."
      : threat === "medium"
        ? "Possible manipulation. Stay cautious and keep the conversation on record."
        : "No significant threat detected. Safe to respond normally.";
  return { message: text, threat, risk, action };
}

export const riskMeta: Record<RiskLevel, { label: string; token: "safe" | "caution" | "danger"; emoji: string }> = {
  low: { label: "Low Risk", token: "safe", emoji: "🟢" },
  medium: { label: "Medium Risk", token: "caution", emoji: "🟡" },
  high: { label: "High Risk", token: "danger", emoji: "🔴" },
};

export interface IncidentRecord {
  id: string;
  code: string;
  date: string;
  location: string;
  evidence: string;
  status: RiskLevel;
}

export type ReportKind = "sos" | "guardian" | "scan";

export interface SafetyReport {
  id: string;
  kind: ReportKind;
  title: string;
  detail: string;
  time: string;
  tone: "safe" | "info" | "alert";
}

export interface ProtocolStep {
  key: "location" | "guardians" | "evidence";
  title: string;
  sub: string;
}

export const emergencyProtocol: ProtocolStep[] = [
  { key: "location", title: "Location shared", sub: "Live location sent to your guardians" },
  { key: "guardians", title: "Trusted guardians notified", sub: "Your Safety Circle alerted" },
  { key: "evidence", title: "Evidence vault enabled", sub: "Audio & location recording started" },
];

export type SessionStatus = "active" | "completed" | "escalated";

export interface SafetySession {
  id: string;
  destination: string;
  startedAt: string;
  endedAt: string | null;
  safetyScore: number;
  risk: RiskLevel;
  status: SessionStatus;
  explanation?: string;
}

export interface SafetyPreference {
  key: "autoGuardian" | "locationSharing" | "evidenceBackup" | "emergencyAlerts";
  title: string;
  desc: string;
  recommended: boolean;
}

export const safetyPreferences: SafetyPreference[] = [
  { key: "autoGuardian", title: "Auto Guardian Mode", desc: "Arm Guardian Shield on risky routes", recommended: true },
  { key: "locationSharing", title: "Location Sharing", desc: "Share live location with your circle", recommended: true },
  { key: "evidenceBackup", title: "Evidence Backup", desc: "Auto-save encrypted evidence to the vault", recommended: true },
  { key: "emergencyAlerts", title: "Emergency Alerts", desc: "Instantly notify guardians in an SOS", recommended: true },
];

export interface PermissionStatus {
  key: "location" | "camera" | "microphone" | "notifications";
  label: string;
  granted: boolean;
}

export const permissionStatuses: PermissionStatus[] = [
  { key: "location", label: "Location", granted: true },
  { key: "camera", label: "Camera", granted: true },
  { key: "microphone", label: "Microphone", granted: true },
  { key: "notifications", label: "Notifications", granted: true },
];

export type GuardianAvailability = "available" | "away" | "offline";

export interface GuardianMember {
  id: string;
  name: string;
  role: string;
  initials: string;
  availability: GuardianAvailability;
}

export const availabilityMeta: Record<GuardianAvailability, { label: string; token: "safe" | "caution" | "muted" }> = {
  available: { label: "Available now", token: "safe" },
  away: { label: "Away", token: "caution" },
  offline: { label: "Offline", token: "muted" },
};

export interface ShieldPermission {
  key: "location" | "audio" | "evidence" | "alerts";
  label: string;
  desc: string;
  enabled: boolean;
}

export const shieldPermissions: ShieldPermission[] = [
  { key: "location", label: "Location Access", desc: "Share live location during Guardian Shield", enabled: true },
  { key: "audio", label: "Audio Monitoring", desc: "Capture ambient audio in an emergency", enabled: true },
  { key: "evidence", label: "Evidence Capture", desc: "Auto-save encrypted evidence to your vault", enabled: true },
  { key: "alerts", label: "Emergency Alerts", desc: "Instantly notify your Guardian Network", enabled: true },
];

export interface CompletionItem {
  key: string;
  label: string;
  done: boolean;
}

export const completionItems: CompletionItem[] = [
  { key: "profile", label: "Profile", done: true },
  { key: "guardians", label: "Trusted Guardians", done: true },
  { key: "location", label: "Location Access", done: true },
  { key: "backup", label: "Evidence Backup verified", done: false },
  { key: "sos", label: "SOS test completed", done: false },
];

export type FactorStatus = "good" | "warn" | "bad";

export interface SafetyFactor {
  key: "places" | "time" | "activity" | "movement";
  label: string;
  value: string;
  status: FactorStatus;
  score: number; // 0-100 contribution
}

export interface DestinationAnalysis {
  id: string;
  name: string;
  address: string;
  etaMinutes: number;
  distanceKm: number;
  safetyScore: number;
  risk: RiskLevel;
  tone: "safe" | "caution" | "danger";
  summary: string;
  reasons: string[];
  factors: SafetyFactor[];
  inputs: RouteInputs;
}

export const destinations: DestinationAnalysis[] = [
  {
    id: "d1",
    name: "Safe Area Destination",
    address: "Active Commercial Zone",
    etaMinutes: 15,
    distanceKm: 4.2,
    safetyScore: 92,
    risk: "low",
    tone: "safe",
    summary: "This route looks safe. Guardian Shield will monitor you the whole way.",
    reasons: [
      "Main road route",
      "Active public area nearby",
      "Safe locations detected",
    ],
    factors: [
      { key: "places", label: "Nearby public places", value: "5 within 500m", status: "good", score: 96 },
      { key: "time", label: "Time of day", value: "8:42 PM · busy hours", status: "good", score: 82 },
      { key: "activity", label: "Route activity", value: "High foot traffic", status: "good", score: 94 },
      { key: "movement", label: "Movement pattern", value: "Steady, expected pace", status: "good", score: 90 },
    ],
    inputs: {
      areaActivity: "high",
      safeZones: { hospitals: 1, police: 1, stores: 2, publicPlaces: 2 },
      guardianActive: true,
    },
  },
  {
    id: "d2",
    name: "Moderate Risk Route",
    address: "Residential Edge",
    etaMinutes: 22,
    distanceKm: 5.6,
    safetyScore: 58,
    risk: "medium",
    tone: "caution",
    summary: "This route has some risk. Review the details before you continue.",
    reasons: [
      "Partly dim, low-lit stretches",
      "Fewer public places nearby",
      "Foot traffic drops after 9 PM",
    ],
    factors: [
      { key: "places", label: "Nearby public places", value: "2 within 500m", status: "warn", score: 55 },
      { key: "time", label: "Time of day", value: "9:20 PM · quieter", status: "warn", score: 48 },
      { key: "activity", label: "Route activity", value: "Low foot traffic", status: "warn", score: 52 },
      { key: "movement", label: "Movement pattern", value: "Normal pace", status: "good", score: 78 },
    ],
    inputs: {
      areaActivity: "medium",
      safeZones: { hospitals: 0, police: 0, stores: 1, publicPlaces: 1 },
      guardianActive: true,
    },
  },
  {
    id: "d3",
    name: "High Risk Area",
    address: "Industrial Zone",
    etaMinutes: 28,
    distanceKm: 7.1,
    safetyScore: 25,
    risk: "high",
    tone: "danger",
    summary: "High risk route detected. Alert mode is recommended before you move.",
    reasons: [
      "Isolated, poorly lit area",
      "No safe places nearby",
      "Almost no public activity",
    ],
    factors: [
      { key: "places", label: "Nearby public places", value: "0 within 500m", status: "bad", score: 14 },
      { key: "time", label: "Time of day", value: "11:48 PM · late night", status: "bad", score: 18 },
      { key: "activity", label: "Route activity", value: "Deserted", status: "bad", score: 12 },
      { key: "movement", label: "Movement pattern", value: "Irregular · possible detour", status: "warn", score: 40 },
    ],
    inputs: {
      areaActivity: "low",
      safeZones: { hospitals: 0, police: 0, stores: 0, publicPlaces: 0 },
      guardianActive: true,
    },
  },
];