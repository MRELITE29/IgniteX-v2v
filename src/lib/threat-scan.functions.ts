// ============================================================================
// SafeSphere — AI Threat Scanner (server function).
//
// Runs real threat analysis through Google Gemini on the SERVER only, so the
// GEMINI_API_KEY never reaches the browser. The signed-in user's session is
// enforced by `requireSupabaseAuth`, and the result is persisted to the
// existing `threat_scans` table under that user's Row Level Security scope.
//
// If GEMINI_API_KEY is missing or the AI call fails, a local heuristic
// fallback keeps the scanner working (never throws to the UI).
// ============================================================================

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ThreatLevel = "low" | "medium" | "high";
export type ThreatCategory =
  | "Harassment"
  | "Blackmail"
  | "Threat"
  | "Manipulation"
  | "Safe";

export interface ThreatAnalysis {
  threat: ThreatLevel;
  risk: number;
  categories: ThreatCategory[];
  explanation: string;
  action: string;
}

const inputSchema = z.object({ text: z.string().trim().min(1).max(4000) });

export const analyzeThreat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<ThreatAnalysis> => {
    const { supabase, userId } = context;
    const message = data.text;

    const CATEGORIES = ["Harassment", "Blackmail", "Threat", "Manipulation", "Safe"];

    const clampRisk = (n: unknown): number => {
      const v = typeof n === "number" ? n : Number(n);
      if (!Number.isFinite(v)) return 0;
      return Math.max(0, Math.min(100, Math.round(v)));
    };
    const toThreat = (score: number): ThreatLevel =>
      score >= 65 ? "high" : score >= 30 ? "medium" : "low";

    // Local heuristic fallback (used if the AI call fails).
    const fallback = (): ThreatAnalysis => {
      const t = message.toLowerCase();
      const highWords = ["kill", "follow", "know where", "come out", "or i'll", "threat", "hurt", "share the", "watching", "die"];
      const medWords = ["urgent", "money", "send", "alone", "meet now", "don't tell", "secret"];
      let risk = 6;
      for (const w of highWords) if (t.includes(w)) risk += 32;
      for (const w of medWords) if (t.includes(w)) risk += 14;
      risk = clampRisk(Math.min(risk, 98));
      const threat = toThreat(risk);
      return {
        threat,
        risk,
        categories: threat === "low" ? ["Safe"] : ["Manipulation"],
        explanation:
          threat === "high"
            ? "This message contains language commonly associated with threats or coercion."
            : threat === "medium"
              ? "This message shows possible pressure or manipulation cues."
              : "No significant threat indicators were detected in this message.",
        action:
          threat === "high"
            ? "Do not engage — save evidence and alert a guardian now."
            : threat === "medium"
              ? "Stay cautious and keep the conversation on record."
              : "No threat detected. Safe to respond normally.",
      };
    };

    const systemPrompt =
      "You are SafeSphere's safety analyst. Analyze a single message for personal-safety threats " +
      "(harassment, blackmail/sextortion, direct threats, or manipulation). " +
      "Respond ONLY with a compact json object of this exact shape: " +
      '{"threatLevel":"LOW"|"MEDIUM"|"HIGH","riskScore":<integer 0-100>,' +
      '"categories":["Harassment"|"Blackmail"|"Threat"|"Manipulation"|"Safe"],' +
      '"explanation":"<one short sentence>","recommendedAction":"<one short sentence>"}. ' +
      "riskScore must align with threatLevel (LOW 0-29, MEDIUM 30-64, HIGH 65-100). " +
      'Use ["Safe"] for benign messages. Keep explanation and recommendedAction under 160 characters.';

    let analysis: ThreatAnalysis;
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

      // Google Gemini (Google AI Studio) generateContent endpoint.
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [
              { role: "user", parts: [{ text: `Analyze this message:\n"""${message}"""` }] },
            ],
            generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
          }),
        },
      );

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Gemini API ${res.status}: ${body}`);
      }

      const json = await res.json();
      const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
      const parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

      const risk = clampRisk(parsed.riskScore);
      const levelRaw = String(parsed.threatLevel ?? "").toLowerCase();
      const threat: ThreatLevel =
        levelRaw === "high" || levelRaw === "medium" || levelRaw === "low"
          ? (levelRaw as ThreatLevel)
          : toThreat(risk);

      const categories = (Array.isArray(parsed.categories) ? parsed.categories : [])
        .map((c: unknown) => String(c))
        .filter((c: string) => CATEGORIES.includes(c)) as ThreatCategory[];

      analysis = {
        threat,
        risk,
        categories: categories.length ? categories : threat === "low" ? ["Safe"] : ["Manipulation"],
        explanation:
          typeof parsed.explanation === "string" && parsed.explanation.trim()
            ? parsed.explanation.trim().slice(0, 240)
            : fallback().explanation,
        action:
          typeof parsed.recommendedAction === "string" && parsed.recommendedAction.trim()
            ? parsed.recommendedAction.trim().slice(0, 240)
            : fallback().action,
      };
    } catch (err) {
      console.error("[threat-scan] AI analysis failed, using fallback:", err);
      analysis = fallback();
    }

    // Persist to threat_scans (RLS-scoped to the signed-in user).
    try {
      await supabase.from("threat_scans").insert({
        user_id: userId,
        message,
        risk_score: analysis.risk,
        analysis: analysis.action,
      });
    } catch (err) {
      console.error("[threat-scan] Failed to persist scan:", err);
    }

    return analysis;
  });
