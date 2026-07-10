// ============================================================================
// SafeSphere data-access layer.
//
// The ONLY seam the app uses to read/write domain data. Talks to Supabase
// using the browser client; every read/write is scoped to the signed-in user
// by Row Level Security. Components and routes call this service — they never
// touch Supabase directly.
//
// Entity → Supabase table mapping:
//   Profile          → profiles
//   GuardianContact  → guardian_contacts
//   SafetySession    → safety_sessions
//   Incident         → incidents
//   ThreatScan       → threat_scans
//   EvidenceItem     → evidence_items
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import { analyzeThreat } from "./threat-scan.functions";

const db = supabase as any;
import {
  analyzeMessage,
  type GuardianMember,
  type GuardianAvailability,
  type SafetySession,
  type SessionStatus,
  type IncidentRecord,
  type ScanResult,
  type RiskLevel,
} from "./app-data";

export interface Profile {
  fullName: string;
  phone: string;
  email: string;
  address: string;
}

/** Metadata record for an evidence item. No raw binary data is stored here. */
export interface EvidenceItem {
  id: string;
  filename: string;
  fileType: string;
  sizeBytes: number | null;
  storagePath: string | null;
  incidentId: string | null;
  sessionId: string | null;
  isEncrypted: boolean;
  isLocked: boolean;
  createdAt: string;
}

export type GuardianContact = GuardianMember;
export type { SafetySession, IncidentRecord, ScanResult };

const emptyProfile: Profile = { fullName: "", phone: "", email: "", address: "" };

// Use getSession() (local read, no network call) instead of getUser() (server round-trip).
// RLS enforces ownership on the DB side; we just need the UID to scope queries.
async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String(error.message);
  }
  return "Unknown Supabase error";
}

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function relTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function scoreToRisk(score: number | null): RiskLevel {
  if (score === null) return "low";
  return score >= 65 ? "low" : score >= 40 ? "medium" : "high";
}

function riskFromScan(score: number): RiskLevel {
  return score >= 65 ? "high" : score >= 30 ? "medium" : "low";
}

// ── Profile ──────────────────────────────────────────────────────────────────
async function ensureProfile(uid: string): Promise<Profile> {
  const { data, error } = await db
    .from("profiles")
    .select("full_name, phone, email, address, created_at")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });

  if (error) throw error;

  if (data && data.length > 0) {
    const profile = data.reduce(
      (merged: any, row: any) => ({
        full_name: merged.full_name || row.full_name || "",
        phone: merged.phone || row.phone || "",
        email: merged.email || row.email || "",
        address: merged.address || row.address || "",
      }),
      { full_name: "", phone: "", email: "", address: "" },
    );

    return {
      fullName: profile.full_name,
      phone: profile.phone,
      email: profile.email,
      address: profile.address,
    };
  }

  // No row yet — create one (triggers on auth.users aren't available on Cloud).
  return { ...emptyProfile };
}

export const dataService = {
  // profiles ------------------------------------------------------------------
  getProfile: async (): Promise<Profile> => {
    const uid = await currentUserId();
    if (!uid) return { ...emptyProfile };
    return ensureProfile(uid);
  },

  updateProfile: async (patch: Profile): Promise<void> => {
    const uid = await currentUserId();
    if (!uid) return;
    const profile = {
      full_name: patch.fullName,
      phone: patch.phone,
      email: patch.email,
      address: patch.address,
    };

    const { count, error } = await db
      .from("profiles")
      .update(profile, { count: "exact" })
      .eq("user_id", uid);
    if (error) throw error;
    if ((count ?? 0) > 0) return;

    const { error: insertError } = await db
      .from("profiles")
      .insert({ user_id: uid, ...profile });
    if (insertError) throw insertError;
  },

  // guardian_contacts ---------------------------------------------------------
  getGuardianContacts: async (): Promise<GuardianContact[]> => {
    const uid = await currentUserId();
    if (!uid) return [];
    const { data, error } = await db
      .from("guardian_contacts")
      .select("id, name, relationship, phone, priority")
      .eq("user_id", uid)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    if (!data) return [];
    return data.map((g: any) => ({
      id: g.id,
      name: g.name,
      role: g.relationship || "Trusted Guardian",
      phone: g.phone ?? undefined,
      initials: initialsOf(g.name),
      availability: "available" as GuardianAvailability,
    }));
  },

  addGuardianContact: async (input: { name: string; role: string; phone: string }): Promise<void> => {
    const uid = await currentUserId();
    if (!uid) return;
    const { error } = await db.from("guardian_contacts").insert({
      user_id: uid,
      name: input.name,
      relationship: input.role,
      phone: input.phone,
    });
    if (error) throw error;
  },

  updateGuardianContact: async (id: string, input: { name: string; role: string }): Promise<void> => {
    const uid = await currentUserId();
    if (!uid) return;
    const { error } = await db
      .from("guardian_contacts")
      .update({ name: input.name, relationship: input.role })
      .eq("id", id)
      .eq("user_id", uid);
    if (error) throw error;
  },

  deleteGuardianContact: async (id: string): Promise<void> => {
    const uid = await currentUserId();
    if (!uid) return;
    const { error } = await db
      .from("guardian_contacts")
      .delete()
      .eq("id", id)
      .eq("user_id", uid);
    if (error) throw error;
  },

  // safety_sessions -----------------------------------------------------------
  getSafetySessions: async (): Promise<SafetySession[]> => {
    const uid = await currentUserId();
    if (!uid) return [];
    const { data, error } = await db
      .from("safety_sessions")
      .select("id, destination, started_at, ended_at, safety_score, risk_level, status, explanation, latitude, longitude")
      .eq("user_id", uid)
      .order("started_at", { ascending: false });
    if (error) throw error;
    if (!data) return [];
    return data.map((s: any) => ({
      id: s.id,
      destination: s.destination ?? "Journey",
      startedAt: relTime(s.started_at),
      endedAt: s.ended_at ? relTime(s.ended_at) : null,
      safetyScore: s.safety_score ?? 0,
      risk: (s.risk_level as RiskLevel) ?? scoreToRisk(s.safety_score),
      status: (s.status as SessionStatus) ?? "active",
      explanation: s.explanation ?? undefined,
      latitude: s.latitude ?? undefined,
      longitude: s.longitude ?? undefined,
    }));
  },

  getActiveSession: async (): Promise<SafetySession | null> => {
    const sessions = await dataService.getSafetySessions();
    return sessions.find((s) => s.status === "active") ?? null;
  },

  startSession: async (input: {
    destination: string;
    startLocation?: string;
    safetyScore: number;
    risk: RiskLevel;
    explanation?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<void> => {
    const uid = await currentUserId();
    if (!uid) return;
    const { error } = await db.from("safety_sessions").insert({
      user_id: uid,
      destination: input.destination,
      start_location: input.startLocation ?? null,
      safety_score: input.safetyScore,
      risk_level: input.risk,
      explanation: input.explanation ?? null,
      status: "active",
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
    });
    if (error) throw error;
  },

  endSession: async (id: string, status: SessionStatus): Promise<void> => {
    const uid = await currentUserId();
    if (!uid) return;
    const { error } = await db
      .from("safety_sessions")
      .update({ status, ended_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", uid);
    if (error) throw error;
  },

  // incidents -----------------------------------------------------------------
  getIncidents: async (): Promise<IncidentRecord[]> => {
    const uid = await currentUserId();
    if (!uid) return [];
    const { data, error } = await db
      .from("incidents")
      .select("id, risk_level, location, status, created_at, latitude, longitude")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (!data) return [];
    return data.map((i: any) => ({
      id: i.id,
      code: `#${i.id.slice(0, 4).toUpperCase()}`,
      date: relTime(i.created_at),
      location: i.location ?? "Saved",
      evidence: "Protected",
      status: (i.risk_level as RiskLevel) ?? "medium",
      latitude: i.latitude ?? undefined,
      longitude: i.longitude ?? undefined,
    }));
  },

  createIncident: async (input: {
    risk: RiskLevel;
    location?: string;
    sessionId?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<string | null> => {
    const uid = await currentUserId();
    if (!uid) return null;
    const { data, error } = await db
      .from("incidents")
      .insert({
        user_id: uid,
        risk_level: input.risk,
        location: input.location ?? "Saved",
        session_id: input.sessionId ?? null,
        status: "open",
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    return (data as Record<string, unknown>)?.id as string ?? null;
  },

  // threat_scans --------------------------------------------------------------
  getThreatScans: async (): Promise<ScanResult[]> => {
    const uid = await currentUserId();
    if (!uid) return [];
    const { data, error } = await db
      .from("threat_scans")
      .select("id, message, risk_score, analysis, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (!data) return [];
    return data.map((s: any) => ({
      id: s.id,
      message: s.message,
      threat: riskFromScan(s.risk_score ?? 0),
      risk: s.risk_score ?? 0,
      action: s.analysis ?? "",
      time: relTime(s.created_at),
    }));
  },

  scanMessage: async (text: string): Promise<ScanResult> => {
    const uid = await currentUserId();
    if (!uid) {
      const analysis = analyzeMessage(text);
      return { ...analysis, id: "live", time: "Just now" };
    }
    // Real AI analysis via secure server function (persists to threat_scans).
    try {
      const r = await analyzeThreat({ data: { text } });
      return {
        id: "live",
        message: text,
        threat: r.threat,
        risk: r.risk,
        action: r.action,
        explanation: r.explanation,
        categories: r.categories,
        time: "Just now",
      };
    } catch (err) {
      console.error("[data-service] AI scan failed, using local fallback:", err);
      const analysis = analyzeMessage(text);
      return { ...analysis, id: "live", time: "Just now" };
    }
  },

  // evidence_items ------------------------------------------------------------
  // Stores metadata only. Raw files live in Supabase Storage (future).
  getEvidenceItems: async (): Promise<EvidenceItem[]> => {
    const uid = await currentUserId();
    if (!uid) return [];
    const { data, error } = await db
      .from("evidence_items")
      .select("id, filename, file_type, size_bytes, storage_path, incident_id, session_id, is_encrypted, is_locked, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[data-service] getEvidenceItems:", error.message);
      return [];
    }
    if (!data) return [];
    return (data as Array<Record<string, unknown>>).map((e) => ({
      id: e.id as string,
      filename: e.filename as string,
      fileType: e.file_type as string,
      sizeBytes: (e.size_bytes as number | null) ?? null,
      storagePath: (e.storage_path as string | null) ?? null,
      incidentId: (e.incident_id as string | null) ?? null,
      sessionId: (e.session_id as string | null) ?? null,
      isEncrypted: (e.is_encrypted as boolean) ?? false,
      isLocked: (e.is_locked as boolean) ?? true,
      createdAt: e.created_at as string,
    }));
  },

  /**
   * Register evidence metadata when a capture is initiated.
   * `storagePath` is null until the file is actually uploaded to Supabase Storage.
   *
   * TODO: After upload, call updateEvidenceStoragePath() with the real bucket path.
   */
  createEvidenceItem: async (input: {
    filename: string;
    fileType: string;
    incidentId?: string;
    sessionId?: string;
  }): Promise<string | null> => {
    const uid = await currentUserId();
    if (!uid) return null;
    const { data, error } = await db
      .from("evidence_items")
      .insert({
        user_id: uid,
        filename: input.filename,
        file_type: input.fileType,
        incident_id: input.incidentId ?? null,
        session_id: input.sessionId ?? null,
        is_encrypted: false, // Will be true once encrypted upload is implemented
        is_locked: true,
      })
      .select("id")
      .single();
    if (error) {
      console.error("[data-service] createEvidenceItem:", error.message);
      return null;
    }
    return (data as Record<string, unknown>)?.id as string ?? null;
  },

  /**
   * Update the storage path after a successful file upload to Supabase Storage.
   * TODO: Implement when Supabase Storage bucket is configured.
   */
  updateEvidenceStoragePath: async (id: string, storagePath: string, sizeBytes: number): Promise<void> => {
    const uid = await currentUserId();
    if (!uid) return;
    const { error } = await db
      .from("evidence_items")
      .update({ storage_path: storagePath, size_bytes: sizeBytes })
      .eq("id", id)
      .eq("user_id", uid);
    if (error) console.error("[data-service] updateEvidenceStoragePath:", error.message);
  },

  deleteEvidenceItem: async (id: string): Promise<void> => {
    const uid = await currentUserId();
    if (!uid) return;
    // TODO: Also delete the file from Supabase Storage when storagePath is set.
    const { error } = await db
      .from("evidence_items")
      .delete()
      .eq("id", id)
      .eq("user_id", uid);
    if (error) throw error;
  },
};
