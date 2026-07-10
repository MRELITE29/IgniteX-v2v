// ============================================================================
// SafeSphere · Geocoding & Routing Services (OpenStreetMap / OSRM)
//
// Performs address searches using free Nominatim OpenStreetMap API, and
// generates route coordinates, distances and ETAs using public OSRM servers.
// ============================================================================

export interface SearchSuggestion {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface RouteDetails {
  geometry: [number, number][]; // [lat, lon] array
  distance: number; // in km
  duration: number; // in seconds
}

export const routeService = {
  /**
   * Translates text search queries into geographical coordinates using OSM Nominatim.
   */
  searchPlaces: async (query: string): Promise<SearchSuggestion[]> => {
    if (!query.trim()) return [];
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "SafeSphere-App/1.0 (contact@safesphere.app)",
        },
      });

      if (!res.ok) throw new Error(`Nominatim request failed: ${res.status}`);
      const data = await res.json();

      return data.map((item: any) => {
        const addressParts = [];
        if (item.address.road) addressParts.push(item.address.road);
        if (item.address.suburb) addressParts.push(item.address.suburb);
        if (item.address.city || item.address.town || item.address.village) {
          addressParts.push(item.address.city || item.address.town || item.address.village);
        }
        if (item.address.country) addressParts.push(item.address.country);

        return {
          name: item.name || item.display_name.split(",")[0],
          address: addressParts.join(", ") || item.display_name,
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
        };
      });
    } catch (err) {
      console.error("[routeService] searchPlaces Nominatim error:", err);
      return [];
    }
  },

  /**
   * Fetches path geometry coordinates, distance, and duration using OSRM.
   */
  getRoute: async (
    startLat: number,
    startLon: number,
    destLat: number,
    destLon: number
  ): Promise<RouteDetails | null> => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${destLon},${destLat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`OSRM routing failed: ${res.status}`);

      const data = await res.json();
      if (!data.routes || data.routes.length === 0) return null;

      const route = data.routes[0];
      const coordinates = route.geometry.coordinates; // [lon, lat] format from GeoJSON

      // Flip coordinates for Leaflet format [lat, lon]
      const geometry: [number, number][] = coordinates.map((coord: [number, number]) => [
        coord[1],
        coord[0],
      ]);

      return {
        geometry,
        distance: route.distance / 1000, // convert meters to km
        duration: route.duration, // in seconds
      };
    } catch (err) {
      console.error("[routeService] getRoute OSRM error:", err);
      return null;
    }
  },
};
