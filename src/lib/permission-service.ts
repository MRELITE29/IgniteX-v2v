// ============================================================================
// SafeSphere — Centralized Permission Service
//
// Wraps the browser Permissions API for the three sensors SafeSphere uses:
//   location, camera, microphone
//
// Rules:
//   - Permissions are requested contextually (when a feature needs them),
//     never eagerly on page load.
//   - Only the granted/denied STATUS is stored in localStorage, never raw data.
//   - Exposes user-friendly denied messages.
// ============================================================================

export type PermissionKey = "location" | "camera" | "microphone" | "notifications";
export type PermissionStatus = "unknown" | "granted" | "denied" | "prompt";

export interface PermissionResult {
  status: PermissionStatus;
  /** Friendly message to show the user when permission is denied. */
  deniedMessage?: string;
}

const STORAGE_KEY = "safesphere_permissions";

const DENIED_MESSAGES: Record<PermissionKey, string> = {
  location:
    "Location access is blocked. To enable it, open your browser settings → Site settings → Location, and allow this site.",
  camera:
    "Camera access is blocked. To enable it, open your browser settings → Site settings → Camera, and allow this site.",
  microphone:
    "Microphone access is blocked. To enable it, open your browser settings → Site settings → Microphone, and allow this site.",
  notifications:
    "Notifications are blocked. To enable them, open your browser settings → Site settings → Notifications, and allow this site.",
};

const BROWSER_NAME: Record<PermissionKey, PermissionName> = {
  location: "geolocation",
  camera: "camera",
  microphone: "microphone",
  notifications: "notifications" as PermissionName,
};

// ── Persistence helpers ──────────────────────────────────────────────────────

function loadStored(): Record<PermissionKey, PermissionStatus> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { location: "unknown", camera: "unknown", microphone: "unknown", notifications: "unknown" };
}

function saveStatus(key: PermissionKey, status: PermissionStatus) {
  const current = loadStored();
  current[key] = status;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {}
}

// ── Query current status (no prompt) ────────────────────────────────────────

/**
 * Returns the current permission status without prompting the user.
 * Falls back to the last stored value if the Permissions API is unavailable.
 */
export async function queryPermission(key: PermissionKey): Promise<PermissionStatus> {
  if (typeof navigator === "undefined") return "unknown";
  try {
    const result = await navigator.permissions.query({ name: BROWSER_NAME[key] });
    const status = result.state as PermissionStatus;
    saveStatus(key, status);
    return status;
  } catch {
    // Some browsers don't support querying camera/microphone — return stored
    return loadStored()[key];
  }
}

/**
 * Returns the cached status for all three permissions without any network/browser call.
 */
export function getCachedPermissions(): Record<PermissionKey, PermissionStatus> {
  return loadStored();
}

// ── Request permissions ──────────────────────────────────────────────────────

/**
 * Requests location permission. Called when Guardian Shield / session is started.
 * Resolves with the result; never throws.
 */
export async function requestLocation(): Promise<PermissionResult> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { status: "denied", deniedMessage: "Geolocation is not supported by your browser." };
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => {
        saveStatus("location", "granted");
        resolve({ status: "granted" });
      },
      (err) => {
        const status: PermissionStatus = err.code === 1 ? "denied" : "unknown";
        saveStatus("location", status);
        resolve({
          status,
          deniedMessage: status === "denied" ? DENIED_MESSAGES.location : undefined,
        });
      },
      { timeout: 8000, maximumAge: 60000 },
    );
  });
}

/**
 * Requests camera permission. Called when the user activates evidence capture.
 * Immediately stops the stream — we only need the permission grant, not the video.
 */
export async function requestCamera(): Promise<PermissionResult> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices) {
    return { status: "denied", deniedMessage: "Media devices are not supported by your browser." };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((t) => t.stop()); // Stop immediately — we don't record here
    saveStatus("camera", "granted");
    return { status: "granted" };
  } catch (err: unknown) {
    const isNotAllowed =
      err instanceof DOMException &&
      (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
    const status: PermissionStatus = isNotAllowed ? "denied" : "unknown";
    saveStatus("camera", status);
    return {
      status,
      deniedMessage: isNotAllowed ? DENIED_MESSAGES.camera : undefined,
    };
  }
}

/**
 * Requests microphone permission. Called when the user activates audio evidence capture.
 * Immediately stops the stream — we only need the permission grant, not the audio.
 */
export async function requestMicrophone(): Promise<PermissionResult> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices) {
    return { status: "denied", deniedMessage: "Media devices are not supported by your browser." };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    saveStatus("microphone", "granted");
    return { status: "granted" };
  } catch (err: unknown) {
    const isNotAllowed =
      err instanceof DOMException &&
      (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
    const status: PermissionStatus = isNotAllowed ? "denied" : "unknown";
    saveStatus("microphone", status);
    return {
      status,
      deniedMessage: isNotAllowed ? DENIED_MESSAGES.microphone : undefined,
    };
  }
}

export async function requestNotifications(): Promise<PermissionResult> {
  if (typeof Notification === "undefined") {
    return { status: "denied", deniedMessage: "Notifications are not supported by your browser." };
  }
  try {
    const permission = await Notification.requestPermission();
    const status = permission === "granted" ? "granted" : permission === "denied" ? "denied" : "unknown";
    saveStatus("notifications", status);
    return {
      status,
      deniedMessage: status === "denied" ? DENIED_MESSAGES.notifications : undefined,
    };
  } catch (err) {
    saveStatus("notifications", "unknown");
    return { status: "unknown" };
  }
}

/**
 * Requests location, microphone, camera, and notifications as a batch.
 */
export async function requestGuardianPermissions(): Promise<{
  location: PermissionResult;
  microphone: PermissionResult;
  camera: PermissionResult;
  notifications: PermissionResult;
}> {
  const [location, microphone, camera, notifications] = await Promise.all([
    requestLocation(),
    requestMicrophone(),
    requestCamera(),
    requestNotifications(),
  ]);
  return { location, microphone, camera, notifications };
}
