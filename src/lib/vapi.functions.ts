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
    const vapiPhoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;

    console.info("======== VAPI SERVER START ========");
    console.info("Guardian Phone:", data.guardianPhone);
    console.info("User Name:", data.userName);
    console.info("Risk Level:", data.riskLevel);
    console.info("Location:", data.location);
    console.info("VAPI_API_KEY present:", !!vapiApiKey);
    console.info("VAPI_ASSISTANT_ID:", vapiAssistantId ?? "MISSING");
    console.info("VAPI_PHONE_NUMBER_ID:", vapiPhoneNumberId ?? "MISSING");

    if (!vapiApiKey || !vapiAssistantId || !vapiPhoneNumberId) {
      const missing = [
        ...(!vapiApiKey ? ["VAPI_API_KEY"] : []),
        ...(!vapiAssistantId ? ["VAPI_ASSISTANT_ID"] : []),
        ...(!vapiPhoneNumberId ? ["VAPI_PHONE_NUMBER_ID"] : []),
      ];
      console.error("[vapi] Missing env vars:", missing.join(", "));
      console.info("======== VAPI SERVER END ========");
      throw new Error(`Vapi server env missing: ${missing.join(", ")}`);
    }

    if (!data.guardianPhone) {
      console.error("[vapi] Missing customer/guardian phone number.");
      console.info("======== VAPI SERVER END ========");
      throw new Error("Guardian phone number missing");
    }

    const message = `Hello, this is SafeSphere Guardian AI. ${data.userName} has triggered an emergency safety alert. Risk level: ${data.riskLevel}. Last known location: ${data.location}. Please contact them immediately or take necessary action.`;

    const requestBody = {
      assistantId: vapiAssistantId,
      phoneNumberId: vapiPhoneNumberId,
      customer: {
        number: data.guardianPhone,
      },
      assistantOverrides: {
        firstMessage: message,
        variableValues: {
          userName: data.userName,
          riskLevel: data.riskLevel,
          location: data.location,
        },
      },
    };

    console.info("[vapi] Request payload:", JSON.stringify(requestBody, null, 2));

    try {
      const response = await fetch("https://api.vapi.ai/call", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${vapiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      console.info("[vapi] HTTP status:", response.status);
      console.info("[vapi] Response headers:", JSON.stringify(Object.fromEntries(response.headers.entries())));
      console.info("[vapi] Response body:", responseText);

      if (!response.ok) {
        console.error(`[vapi] API error ${response.status}: ${responseText}`);
        console.info("======== VAPI SERVER END ========");
        throw new Error(`Vapi API error: ${response.status} - ${responseText}`);
      }

      // Parse to verify we got a real call object
      try {
        const parsed = JSON.parse(responseText);
        console.info("[vapi] Call ID:", parsed.id ?? "none");
        console.info("[vapi] Call status:", parsed.status ?? "unknown");
      } catch {
        console.warn("[vapi] Could not parse response as JSON");
      }

      console.info("======== VAPI SERVER END ========");
      return { success: true };
    } catch (err) {
      console.error("[vapi] Fetch failed:", err);
      console.info("======== VAPI SERVER END ========");
      throw err;
    }
  });
