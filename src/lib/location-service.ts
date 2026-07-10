import { requestLocation, queryPermission } from "./permission-service";

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export const locationService = {
  /**
   * Retrieves the current browser/device geolocation coordinates.
   * Prompts for permission if it hasn't been granted yet.
   */
  getCurrentLocation: async (): Promise<LocationData | null> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      console.warn("[locationService] Geolocation is not supported by this browser.");
      return null;
    }

    // 1. Query the current permission status
    const status = await queryPermission("location");
    if (status !== "granted") {
      // 2. Request permission contextually (only when started)
      const result = await requestLocation();
      if (result.status !== "granted") {
        console.warn("[locationService] Geolocation permission was denied.");
        return null;
      }
    }

    // 3. Retrieve coordinates
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          });
        },
        (error) => {
          console.error("[locationService] getCurrentPosition error:", error.message);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  },
};
