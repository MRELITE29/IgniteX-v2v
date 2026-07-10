import { dataService } from "./data-service";
import { supabase } from "@/integrations/supabase/client";
import { triggerVapiCall } from "./vapi.functions";

export interface EmergencyAlertPayload {
  incidentId: string;
  userId: string;
  location: string;
  riskLevel: string;
  timestamp: string;
  guardiansCount: number;
  latitude?: number;
  longitude?: number;
  mapsLink?: string;
  vapiSuccess?: boolean;
}

export const notificationService = {
  /**
   * Fetches the user's guardians and simulates dispatching an emergency alert payload.
   */
  notifyGuardians: async (
    incidentId: string,
    location: string,
    riskLevel: string,
    latitude?: number,
    longitude?: number
  ): Promise<EmergencyAlertPayload | null> => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) {
      console.warn("[notificationService] User not authenticated, notification skipped.");
      return null;
    }

    // Fetch real guardian contacts from the database
    const guardians = await dataService.getGuardianContacts();
    const timestamp = new Date().toISOString();
    
    // Generate maps link format: https://maps.google.com/?q=lat,long
    const mapsLink = (latitude !== undefined && longitude !== undefined)
      ? `https://maps.google.com/?q=${latitude},${longitude}`
      : undefined;

    const payload: EmergencyAlertPayload = {
      incidentId,
      userId,
      location,
      riskLevel,
      timestamp,
      guardiansCount: guardians.length,
      latitude,
      longitude,
      mapsLink,
    };

    // Log simulated dispatch to console
    console.group("🚨 [Notification Service] Simulated Emergency Alert Dispatch 🚨");
    console.info("Incident ID:", payload.incidentId);
    console.info("User ID:", payload.userId);
    console.info("Risk Level:", payload.riskLevel);
    console.info("Location:", payload.location);
    if (payload.mapsLink) {
      console.info("Maps Link:", payload.mapsLink);
    }
    console.info("Timestamp:", payload.timestamp);
    console.info(
      "Target Guardians:",
      guardians.map((g) => `${g.name} (${g.phone || "no phone"})`)
    );
    console.groupEnd();

    // Trigger the emergency alert adapter pipeline
    const vapiSuccess = await notificationService.sendEmergencyAlert(payload, guardians);
    payload.vapiSuccess = vapiSuccess;
 
    return payload;
  },

  /**
   * Adapter placeholders for real production notification APIs.
   * Ready for Twilio SMS, WhatsApp Business API, and Email integrations.
   */
  sendEmergencyAlert: async (
    payload: EmergencyAlertPayload,
    guardians: any[]
  ): Promise<boolean> => {
    // Get current user's profile details to pass to Vapi
    let userName = "A SafeSphere user";
    try {
      const profile = await dataService.getProfile();
      if (profile?.fullName) {
        userName = profile.fullName;
      }
    } catch (err) {
      console.warn("[notificationService] Failed to load user profile name:", err);
    }

    let anyVapiSuccess = false;

    // Trigger outbound Vapi AI voice call for each guardian contact with a phone number
    for (const guardian of guardians) {
      if (!guardian.phone) {
        console.warn(`[notificationService] Skipping ${guardian.name} — no phone number.`);
        continue;
      }

      // Normalize phone to E.164 (strip spaces/dashes)
      const normalizedPhone = guardian.phone.replace(/[\s\-()]/g, "");
      if (!/^\+\d{7,15}$/.test(normalizedPhone)) {
        console.error(`[notificationService] Invalid E.164 phone for ${guardian.name}: "${guardian.phone}" → "${normalizedPhone}"`);
        continue;
      }

      console.info("======== VAPI DISPATCH START ========");
      console.info("Guardian Name:", guardian.name);
      console.info("Guardian Phone (raw):", guardian.phone);
      console.info("Guardian Phone (E.164):", normalizedPhone);
      console.info("Risk Level:", payload.riskLevel);
      console.info("Location:", payload.mapsLink || payload.location);

      try {
        const res = await triggerVapiCall({
          data: {
            userName,
            guardianPhone: normalizedPhone,
            riskLevel: payload.riskLevel,
            location: payload.mapsLink || payload.location,
          }
        });
        if (res && res.success) {
          anyVapiSuccess = true;
          console.info(`[notificationService] ✅ Vapi call SUCCEEDED for ${guardian.name}`);
        } else {
          console.error(`[notificationService] ❌ Vapi returned falsy result for ${guardian.name}:`, res);
        }
      } catch (err: any) {
        console.error(`[notificationService] ❌ Vapi call FAILED for ${guardian.name}:`, err?.message || err);
      }
      console.info("======== VAPI DISPATCH END ========");
    }

    return anyVapiSuccess;
  },
};
