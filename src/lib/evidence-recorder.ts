import { storageService } from "./storage-service";
import { dataService } from "./data-service";
import { toast } from "sonner";

/**
 * Capture video + audio evidence from the user's browser,
 * upload it to Supabase Storage, and save its metadata in the database.
 * Falls back gracefully to audio-only or video-only, and does not crash if denied.
 */
export async function captureEmergencyEvidence(incidentId: string): Promise<void> {
  let stream: MediaStream | null = null;
  let mediaRecorder: MediaRecorder | null = null;
  const chunks: Blob[] = [];

  try {
    // 1. Request camera and microphone access dynamically at emergency time
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (e1) {
      console.warn("[evidenceRecorder] Dual capture failed, attempting audio-only...", e1);
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e2) {
        console.warn("[evidenceRecorder] Audio capture failed, attempting video-only...", e2);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (e3) {
          console.warn("[evidenceRecorder] All capture attempts denied by user/browser.", e3);
          toast.error("Evidence recording unavailable: Permissions denied");
          return; // Fail gracefully: continue emergency flow without media recording
        }
      }
    }

    if (!stream) {
      toast.error("Evidence recording unavailable: Stream empty");
      return;
    }

    // 2. Start recording using MediaRecorder API
    let options = {};
    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
      options = { mimeType: "video/webm;codecs=vp9" };
    } else if (MediaRecorder.isTypeSupported("video/webm")) {
      options = { mimeType: "video/webm" };
    } else if (MediaRecorder.isTypeSupported("audio/webm")) {
      options = { mimeType: "audio/webm" };
    }

    mediaRecorder = new MediaRecorder(stream, options);
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.start();
    console.info("[evidenceRecorder] Started browser recording clip.");

    // Record a 5-second safety clip automatically
    await new Promise((resolve) => setTimeout(resolve, 5000));

    if (mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }

    // Wait for the onstop event to construct the final Blob
    await new Promise<void>((resolve) => {
      if (mediaRecorder) {
        mediaRecorder.onstop = () => resolve();
      } else {
        resolve();
      }
    });

    const isVideo = stream.getVideoTracks().length > 0;
    const fileType = isVideo ? "video/webm" : "audio/webm";
    const timestamp = Date.now();
    const filename = `emergency_clip_${timestamp}.webm`;
    const blob = new Blob(chunks, { type: fileType });
    const sizeBytes = blob.size;

    console.info(`[evidenceRecorder] Created blob (${sizeBytes} bytes, ${fileType}). Uploading...`);

    // 3. Register metadata in the database first
    const evidenceId = await dataService.createEvidenceItem({
      filename,
      fileType,
      incidentId,
    });

    if (!evidenceId) {
      throw new Error("Could not create evidence record in database.");
    }

    // 4. Upload binary to Supabase Storage (path: user_id/incident_id/filename)
    const storagePath = await storageService.uploadEvidence(blob, filename, incidentId);

    // 5. Update evidence record with storage_path and file_size
    await dataService.updateEvidenceStoragePath(evidenceId, storagePath, sizeBytes);

    toast.success("Emergency evidence securely uploaded to Vault 🛡️");

  } catch (err: any) {
    console.error("[evidenceRecorder] Pipeline failed:", err);
    toast.error("Evidence upload failed: Incident logged without media.");
  } finally {
    // 6. Cleanup: Stop camera & mic tracks, release resources
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
        console.info(`[evidenceRecorder] Stopped track: ${track.kind}`);
      });
    }
  }
}
