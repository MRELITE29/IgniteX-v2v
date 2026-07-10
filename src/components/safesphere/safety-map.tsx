import React, { useEffect, useState } from "react";

let MapContainer: any = null;
let TileLayer: any = null;
let Marker: any = null;
let Popup: any = null;
let Polyline: any = null;
let L: any = null;
let useMap: any = null;

interface SafetyMapProps {
  latitude?: number;
  longitude?: number;
  destLatitude?: number;
  destLongitude?: number;
  routeCoordinates?: [number, number][];
  risk?: "low" | "medium" | "high";
  guardianActive?: boolean;
  message?: string;
  destMessage?: string;
}

// Client-only component to update Leaflet view bounds or center dynamically
function ChangeView({ bounds, center }: { bounds?: number[][]; center?: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0 && bounds[0] && bounds[1]) {
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (center) {
      map.setView(center, 15);
    }
  }, [bounds, center, map]);
  return null;
}

export function SafetyMap({
  latitude,
  longitude,
  destLatitude,
  destLongitude,
  routeCoordinates,
  risk = "low",
  guardianActive = false,
  message = "You are here",
  destMessage = "Destination",
}: SafetyMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const loadLeaflet = async () => {
      const leaflet = await import("leaflet");
      const reactLeaflet = await import("react-leaflet");
      await import("leaflet/dist/leaflet.css");

      L = leaflet.default;
      MapContainer = reactLeaflet.MapContainer;
      TileLayer = reactLeaflet.TileLayer;
      Marker = reactLeaflet.Marker;
      Popup = reactLeaflet.Popup;
      Polyline = reactLeaflet.Polyline;
      useMap = reactLeaflet.useMap;

      // Fix default marker icons
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      });

      setMounted(true);
    };

    loadLeaflet();
  }, []);

  if (!latitude || !longitude) {
    return (
      <div className="flex h-full w-full min-h-[300px] flex-col items-center justify-center bg-muted/10 text-muted-foreground p-6 text-center rounded-[2rem] border border-border">
        <MapPinOff className="h-8 w-8 text-muted/30 mb-2" />
        <p className="text-sm font-semibold">Location Map Unavailable</p>
        <p className="text-xs text-muted-foreground mt-1">Enable location permissions or check GPS signal</p>
      </div>
    );
  }

  if (!mounted) {
    return (
      <div className="flex h-full w-full min-h-[300px] flex-col items-center justify-center bg-muted/10 text-muted-foreground p-6 text-center rounded-[2rem] border border-border">
        <span className="h-2.5 w-2.5 rounded-full bg-primary animate-ping mb-2" />
        <p className="text-xs font-semibold">Loading real-time map visualization…</p>
      </div>
    );
  }

  const center: [number, number] = [latitude, longitude];
  const markerColor = risk === "high" ? "#FF4D4D" : risk === "medium" ? "#FFB700" : "#1ED760";

  // Pulsing current location GPS marker icon
  const currentIcon = L.divIcon({
    html: `<div style="position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;">
      <span style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background-color: ${markerColor}; opacity: 0.35;" class="pulse-ring animate-pulse"></span>
      <span style="position: absolute; width: 14px; height: 14px; border-radius: 50%; background-color: ${markerColor}; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></span>
    </div>`,
    className: "custom-gps-icon",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

  // Destination shield marker icon
  const destIcon = L.divIcon({
    html: `<div style="position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;">
      <span style="position: absolute; width: 14px; height: 14px; border-radius: 4px; transform: rotate(45deg); background-color: #0d1117; border: 2.5px solid ${markerColor}; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></span>
      <span style="position: absolute; color: white; font-size: 8px; font-weight: bold; font-family: sans-serif;">D</span>
    </div>`,
    className: "custom-dest-icon",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

  const bounds =
    destLatitude && destLongitude
      ? [
          [latitude, longitude],
          [destLatitude, destLongitude],
        ]
      : undefined;

  return (
    <div className="relative h-full w-full min-h-[300px] rounded-[2rem] overflow-hidden border border-border shadow-[var(--shadow-soft)]">
      <MapContainer
        center={center}
        zoom={15}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ChangeView bounds={bounds} center={center} />

        {/* Start Position Marker */}
        <Marker position={center} icon={currentIcon}>
          <Popup>
            <div className="text-xs p-1 font-sans">
              <p className="font-bold text-foreground">{message}</p>
              <p className="text-muted-foreground mt-0.5">
                GPS Accuracy: high · {guardianActive ? "Shield active 🛡️" : "Unmonitored"}
              </p>
            </div>
          </Popup>
        </Marker>

        {/* Destination Marker */}
        {destLatitude && destLongitude && (
          <Marker position={[destLatitude, destLongitude]} icon={destIcon}>
            <Popup>
              <div className="text-xs p-1 font-sans">
                <p className="font-bold text-foreground">{destMessage}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route Line Polyline */}
        {routeCoordinates && routeCoordinates.length > 0 && (
          <Polyline
            positions={routeCoordinates}
            pathOptions={{
              color: markerColor,
              weight: 5,
              opacity: 0.75,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}
      </MapContainer>

      {/* Floating status badges */}
      <div className="absolute top-3 left-3 z-[10] flex flex-col gap-1.5 pointer-events-none">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-md ${
          risk === "high" ? "bg-danger" : risk === "medium" ? "bg-caution" : "bg-safe"
        }`}>
          Risk: {risk === "high" ? "Higher Attention" : risk === "medium" ? "Moderate" : "Safe"}
        </span>
        {guardianActive && (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground shadow-md">
            🛡️ Shield Active
          </span>
        )}
      </div>
    </div>
  );
}

function MapPinOff(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12.75 18a1.25 1.25 0 0 0 1.25-1.25V14.5a3 3 0 0 0-3-3H7.5A3 3 0 0 0 4.5 14.5v2.25c0 .69.56 1.25 1.25 1.25h7Z" />
      <path d="M18.8 4.2a9 9 0 0 0-13.6 0" />
      <path d="M19 12a7 7 0 0 0-10.4-6" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}
