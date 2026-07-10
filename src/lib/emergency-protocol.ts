import { locationService } from "./location-service";
import { dataService } from "./data-service";
import { notificationService } from "./notification-service";
import { captureEmergencyEvidence } from "./evidence-recorder";
import { toast } from "sonner";
import { QueryClient } from "@tanstack/react-query";

export type AsyncStatus = "idle" | "loading" | "success" | "failed";

export interface EmergencyState {
  locStatus: AsyncStatus;
  vapiStatus: AsyncStatus;
  evidenceStatus: AsyncStatus;
}

export const executeEmergencyProtocol = async (
  qc: QueryClient,
  onUpdate: (state: Partial<EmergencyState>) => void,
  source: string = "Emergency Protocol"
) => {
  onUpdate({ locStatus: "loading", vapiStatus: "loading", evidenceStatus: "loading" });

  try {
    let loc = null;
    try {
      loc = await locationService.getCurrentLocation();
      onUpdate({ locStatus: "success" });
    } catch (err) {
      console.warn(`[EmergencyProtocol] Geolocation failed:`, err);
      onUpdate({ locStatus: "failed" });
    }

    const incidentId = await dataService.createIncident({
      risk: "high",
      location: source,
      latitude: loc?.latitude,
      longitude: loc?.longitude,
    });

    if (incidentId) {
      try {
        const payload = await notificationService.notifyGuardians(
          incidentId,
          source,
          "high",
          loc?.latitude,
          loc?.longitude
        );
        if (payload && (payload as any).vapiSuccess) {
          onUpdate({ vapiStatus: "success" });
          toast.success("Guardians notified successfully.");
        } else {
          onUpdate({ vapiStatus: "failed" });
          toast.error("Guardian dispatch failed.");
        }
      } catch (err) {
        onUpdate({ vapiStatus: "failed" });
        toast.error("Error occurred while triggering Guardian alerts.");
      }

      captureEmergencyEvidence(incidentId)
        .then(() => {
          onUpdate({ evidenceStatus: "success" });
          qc.invalidateQueries({ queryKey: ["evidence-items"] });
        })
        .catch((err) => {
          onUpdate({ evidenceStatus: "failed" });
          console.error("[EmergencyProtocol] captureEmergencyEvidence failed:", err);
        });
    } else {
      onUpdate({ vapiStatus: "failed", evidenceStatus: "failed" });
      console.warn("[EmergencyProtocol] Incident creation returned null ID, skipping recording & notification.");
    }
  } catch (err) {
    onUpdate({ locStatus: "failed", vapiStatus: "failed", evidenceStatus: "failed" });
    console.error("[EmergencyProtocol] Sequence failed:", err);
    toast.error("Emergency protocol sequence failed to initialize.");
  }
};
