# SafeSphere

Developed by **Team IgniteX** for secure personal protection and real-time digital safety.

## Problem Statement
In an increasingly unpredictable physical and digital environment, individuals lack a unified, privacy-first personal safety tool. Traditional security apps often leak user telemetry, rely on unencrypted storage, or eagerly track location data without context. SafeSphere provides an end-to-end encrypted, context-aware safety portal that empowers users with automated physical guardian alerts, digital scanners, and a secure evidence vault.

## Tech Stack

### Frontend
*   **React / TanStack Start / Vite**: A state-of-the-art server-run framework delivering static/SSR capabilities with zero client-side latency.
*   **Vanilla CSS**: Clean, premium glassmorphism styling.
*   **Lucide Icons & Framer Motion**: Intuitive micro-animations and aesthetic iconography.

### Backend
*   **Supabase**: Real-time server queries, client-side Row-Level Security (RLS) enforcement, and custom database integrations.

### AI Integration
*   **Google Gemini API**: Context-aware digital scan models running securely on server-side functions.

### Map Visualization
*   **Leaflet & OpenStreetMap**: Free, open-source tile rendering and interactive geolocation tracking maps with no Google Maps API overhead.

---

## Key Features

1. **Guardian Shield**
   Active tracking when transit journeys are initiated. Real-time context-aware safety scoring assesses route safety dynamically depending on the time of day, nearby safe zones (hospitals/police/stores), and active protection status.
   
2. **Dynamic Location Permissions**
   Location access is requested only when a protective journey starts, keeping user telemetry private.
   
3. **Emergency Evidence Vault**
   If the safety countdown expires without response, an automated incident is logged. SafeSphere initiates a browser `MediaRecorder` clip (audio + video), uploads it directly to a private Supabase Storage bucket, and registers encryption metadata.
   
4. **Guardian Notification Dispatch**
   Triggers alerts to your trusted guardian contacts during emergency protocol activation, attaching a Google Maps location sharing link (`https://maps.google.com/?q=lat,long`).
   
5. **AI Digital Safety Scanner**
   Paste suspect communication or harassment scripts to analyze manipulation indicators and risk ratings privately.
