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
    await notificationService.sendEmergencyAlert(payload, guardians);

    return payload;
  },

  /**
   * Adapter placeholders for real production notification APIs.
   * Ready for Twilio SMS, WhatsApp Business API, and Email integrations.
   */
  sendEmergencyAlert: async (
    payload: EmergencyAlertPayload,
    guardians: any[]
  ): Promise<void> => {
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

    // Trigger outbound Vapi AI voice call for each guardian contact with a phone number
    for (const guardian of guardians) {
      if (guardian.phone) {
        try {
          console.info(`[notificationService] Triggering Vapi AI call to ${guardian.name} at ${guardian.phone}...`);
          await triggerVapiCall({
            data: {
              userName,
              guardianPhone: guardian.phone,
              riskLevel: payload.riskLevel,
              location: payload.location,
            }
          });
          console.info(`[notificationService] Vapi AI call successfully dispatched for ${guardian.name}`);
        } catch (err) {
          console.error(`[notificationService] Vapi AI call failed for ${guardian.name}:`, err);
        }
      }
    }

    // Simulate brief network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    console.info("[notificationService] Production messaging adapters prepared:");

    // 1. Twilio SMS Integration Stub
    console.info("  [TODO: Twilio SMS Adapter]");
    console.info(
      "    // Example implementation:\n" +
      "    // const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);\n" +
      "    // for (const guardian of guardians) {\n" +
      "    //   if (guardian.phone) {\n" +
      "    //     await client.messages.create({\n" +
      "    //       body: `SafeSphere EMERGENCY: User needs assistance. Incident details: ${payload.location}. Link: https://safesphere.app/incidents/${payload.incidentId}`,\n" +
      "    //       to: guardian.phone,\n" +
      "    //       from: process.env.TWILIO_PHONE_NUMBER\n" +
      "    //     });\n" +
      "    //   }\n" +
      "    // }"
    );

    // 2. WhatsApp Business API Integration Stub
    console.info("  [TODO: WhatsApp Business API Adapter]");
    console.info(
      "    // Example implementation:\n" +
      "    // await fetch(`https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {\n" +
      "    //   method: 'POST',\n" +
      "    //   headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },\n" +
      "    //   body: JSON.stringify({ messaging_product: 'whatsapp', to: guardian.phone, type: 'template', template: { name: 'emergency_alert' } })\n" +
      "    // });"
    );

    // 3. Email Integration Stub (e.g. Resend, Sendgrid)
    console.info("  [TODO: Email Notification Adapter]");
    console.info(
      "    // Example implementation:\n" +
      "    // await resend.emails.send({\n" +
      "    //   from: 'emergency@safesphere.app',\n" +
      "    //   to: guardian.email || 'guardian@example.com',\n" +
      "    //   subject: '🚨 SafeSphere Emergency Notification',\n" +
      "    //   html: `<p>A SafeSphere user has triggered an emergency alert. Location: ${payload.location}</p>`\n" +
      "    // });"
    );
  },
};
