// ============================================================================
// SafeSphere — Vapi Outbound Calling server function.
//
// Triggers outbound AI calls to guardians on the SERVER only, so the
// VAPI_API_KEY and VAPI_ASSISTANT_ID never reach the browser. The signed-in
// user's session is enforced by `requireSupabaseAuth`.
// ============================================================================

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const vapiInputSchema = z.object({
  userName: z.string().trim().min(1),
  guardianPhone: z.string().trim().min(1),
  riskLevel: z.string().trim().min(1),
  location: z.string().trim().min(1),
});

export const triggerVapiCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => vapiInputSchema.parse(data))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const vapiApiKey = process.env.VAPI_API_KEY;
    const vapiAssistantId = process.env.VAPI_ASSISTANT_ID;

    if (!vapiApiKey || !vapiAssistantId) {
      console.warn("[vapi] Missing VAPI_API_KEY or VAPI_ASSISTANT_ID. Call aborted.");
      throw new Error("Vapi credentials missing in server environment");
    }

    const message = `Hello, this is SafeSphere Guardian AI. ${data.userName} has triggered an emergency safety alert. Risk level: ${data.riskLevel}. Last known location: ${data.location}. Please contact them immediately or take necessary action.`;

    try {
      const response = await fetch("https://api.vapi.ai/call/phone", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${vapiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assistantId: vapiAssistantId,
          assistantOverrides: {
            firstMessage: message,
          },
          customer: {
            number: data.guardianPhone,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[vapi] API returned error status ${response.status}:`, errorText);
        throw new Error(`Vapi API error: ${response.status} - ${errorText}`);
      }

      console.info(`[vapi] Outbound call triggered successfully to ${data.guardianPhone}`);
      return { success: true };
    } catch (err) {
      console.error("[vapi] Fetch failed while calling Vapi API:", err);
      throw err;
    }
  });
