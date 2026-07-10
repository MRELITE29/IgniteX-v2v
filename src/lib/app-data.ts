import type { RouteInputs } from "./route-intelligence";

export type RiskLevel = "low" | "medium" | "high";

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

export function analyzeMessage(text: string): Omit<ScanResult, "id" | "time"> {
  const value = text.toLowerCase();
  const highWords = ["kill", "follow", "know where", "come out", "or i'll", "threat", "hurt", "share the", "watching", "die"];
  const mediumWords = ["urgent", "money", "send", "alone", "meet now", "don't tell", "secret"];
  let risk = 6;
  for (const word of highWords) if (value.includes(word)) risk += 32;
  for (const word of mediumWords) if (value.includes(word)) risk += 14;
  risk = Math.min(risk, 98);
  const threat: RiskLevel = risk >= 65 ? "high" : risk >= 30 ? "medium" : "low";
  const action =
    threat === "high"
      ? "High threat. Do not engage - save evidence and alert a guardian now."
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

export interface ProtocolStep {
  key: "location" | "guardians" | "evidence";
  title: string;
  sub: string;
}

export const emergencyProtocol: ProtocolStep[] = [
  { key: "location", title: "Location shared", sub: "Live location prepared for emergency sharing" },
  { key: "guardians", title: "Trusted guardians notified", sub: "Your saved Guardian Network alerted" },
  { key: "evidence", title: "Evidence vault enabled", sub: "Emergency evidence capture started" },
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

export interface IncidentRecord {
  id: string;
  code: string;
  date: string;
  location: string;
  evidence: string;
  status: RiskLevel;
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
  phone?: string;
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

export type FactorStatus = "good" | "warn" | "bad";

export interface SafetyFactor {
  key: "places" | "time" | "activity" | "movement";
  label: string;
  value: string;
  status: FactorStatus;
  score: number;
}

export interface DestinationAnalysis {
  id: string;
  name: string;
  address: string;
  inputs: RouteInputs;
}
