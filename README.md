# 🛡️ SafeSphere by IgniteX

## The Problem

Most safety applications are reactive—they rely on users to manually press an SOS button during an emergency. In real-world situations, victims may not have enough time or the ability to unlock their phone and ask for help.

## Our Solution

**SafeSphere** is an AI-powered personal safety platform that focuses on **prevention before reaction**.

Instead of waiting for an emergency, SafeSphere continuously monitors the user's journey through **Guardian Shield**, analyzes contextual information such as location, route, travel progress, and user interaction, and intelligently responds when a potentially unsafe situation is detected.

If the user fails to respond to a safety check or manually activates SOS, SafeSphere automatically launches a complete emergency workflow, including live location sharing, secure evidence collection, incident creation, and guardian notification.

---

# 🔗 Important Links

### 🌐 Live Demo

https://ignite-x-v2v.vercel.app/

### 🎥 Demo Video

(https://drive.google.com/file/d/14rDV-0nDCULDjE3XquAG5fJMpxO920sB/view?usp=drivesdk)

---

# ✨ Features

## 🛡️ Guardian Shield

Start protection before beginning a journey.

Guardian Shield continuously:

- Monitors live location
- Tracks journey progress
- Calculates a dynamic Safety Score
- Estimates ETA
- Monitors contextual travel information
- Periodically checks if the user is safe

If the user confirms they are safe, monitoring continues.

If there is no response or an emergency is detected, SafeSphere automatically activates the emergency protocol.

---

## 🗺️ Route Intelligence

SafeSphere analyzes the selected route using:

- Current location
- Destination
- Travel distance
- ETA
- Context-aware safety scoring
- OpenStreetMap routing

Users receive a live Safety Score and risk level before and during their journey.

---

## 🚨 Smart Emergency Response

Emergency Mode can be activated:

- Manually through SOS
- Automatically after Guardian Shield safety checks fail

Emergency Protocol includes:

- Create incident
- Share live GPS location
- Notify trusted guardians
- Trigger AI-powered emergency call
- Begin evidence recording
- Continue live journey monitoring

---

## 🎥 Secure Evidence Vault

During an emergency, SafeSphere automatically records evidence.

Evidence includes:

- Audio
- Video
- Incident details
- GPS coordinates
- Timestamp

Files are securely uploaded to a private Supabase Storage bucket and linked with the incident record.

---

## 📍 Live Location Tracking

During Guardian Shield and Emergency Mode:

- Continuous GPS tracking
- Live route visualization
- ETA updates
- Real-time location sharing with guardians

---

## 🤖 AI Threat Scanner

Users can analyze:

- Suspicious messages
- Threatening conversations
- Harassment

Gemini AI provides:

- Threat level
- Risk score
- AI explanation
- Recommended action

---

## ☎️ AI Guardian Calling

When an emergency is confirmed, SafeSphere can automatically initiate an AI-powered phone call to trusted guardians using Vapi.

The guardian receives:

- User's name
- Emergency status
- Risk level
- Last known live location

> **Note:** AI calling is fully integrated. Production deployment requires a supported telephony provider (such as Twilio or another provider supported by Vapi) to place calls to international numbers.

---

# 💻 Tech Stack

## Frontend

- React
- TanStack Start
- TypeScript
- Tailwind CSS
- Framer Motion

## Backend

- Supabase
- PostgreSQL
- Row Level Security (RLS)
- TanStack Server Functions

## Authentication

- Supabase Auth
- Google Authentication

## Maps & Location

- OpenStreetMap
- Leaflet
- OpenStreetMap Nominatim
- OSRM Routing
- Browser Geolocation API

## Artificial Intelligence

- Google Gemini API
- Vapi AI

## Storage

- Supabase Storage
- Evidence Vault

## Development Tools

- Git
- GitHub
- Figma
- VS Code

---

# 📖 How SafeSphere Works

1. The user enables **Guardian Shield** before starting a journey.

2. SafeSphere continuously monitors:
   - Live location
   - Route progress
   - ETA
   - Safety Score
   - Journey status

3. The application periodically asks the user:

   **"Are you safe?"**

4. If the user confirms they are safe, monitoring continues.

5. If the user does not respond or manually activates SOS, SafeSphere automatically:

   - Creates an incident
   - Records emergency evidence
   - Uploads evidence securely
   - Shares live location
   - Notifies trusted guardians
   - Initiates an AI-powered emergency phone call

6. All emergency records are securely stored inside the Evidence Vault.

---

# 🤖 AI Integration

Gemini AI powers:

- Threat message analysis
- Risk assessment
- Emergency guidance
- Context-aware safety recommendations

Vapi AI powers:

- Automated guardian phone calls
- AI-generated emergency voice communication

---

# 🔒 Security & Privacy

- Supabase Authentication
- Row Level Security (RLS)
- Private Evidence Vault
- Signed URLs for secure evidence access
- Server-side AI processing
- Server-side API key protection

---

# 🚀 Future Scope

- Crime hotspot-based route recommendations
- Wearable device integration
- Voice distress detection
- Offline emergency communication
- Community safety network
- Predictive AI risk scoring
- Emergency services integration
- Real-time guardian dashboard
