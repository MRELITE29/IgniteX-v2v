# SafeSphere — Environment Variables

All configuration is read from environment variables so the app is fully
portable. Copy `.env.example` to `.env` for local development, and configure the
same variables in your hosting provider (e.g. Vercel) for production.

> Client-safe variables are prefixed with `VITE_` and are embedded into the
> browser bundle at build time. Never put secrets behind a `VITE_` prefix.

---

### VITE_SUPABASE_URL
- **Purpose:** Base URL of your Supabase project's API.
- **Where to get:** Supabase Dashboard → Project Settings → API → Project URL.
- **Used in:** `src/integrations/supabase/client.ts` (browser client) and server
  functions (via the `SUPABASE_URL` mirror).
- **Visibility:** Client-safe (public).

### VITE_SUPABASE_PUBLISHABLE_KEY
- **Purpose:** Public/anon (publishable) API key used by the browser client.
  All access is still protected by Row Level Security.
- **Where to get:** Supabase Dashboard → Project Settings → API → publishable/anon key.
- **Used in:** `src/integrations/supabase/client.ts`.
- **Visibility:** Client-safe (public).

### GEMINI_API_KEY
- **Purpose:** Runs the AI Threat Scanner. Sends a message to Google Gemini for
  threat analysis and returns a structured result.
- **Where to get:** Google AI Studio → https://aistudio.google.com/app/apikey
- **Used in:** `src/lib/threat-scan.functions.ts` (server function handler only).
- **Visibility:** **Server only.** Never sent to the browser. If missing, the
  scanner falls back to a local heuristic so the feature keeps working.

### VITE_APP_URL
- **Purpose:** Canonical production URL of the deployed app (e.g. used for SEO /
  sitemap / absolute links).
- **Where to get:** Your deployment URL (e.g. `https://safesphere.vercel.app`).
- **Used in:** Canonical/SEO metadata. Auth redirects use the live
  `window.location.origin` at runtime, so this is informational/SEO only.
- **Visibility:** Client-safe (public).

---

### Server mirrors

Server functions and SSR read `process.env.SUPABASE_URL` and
`process.env.SUPABASE_PUBLISHABLE_KEY` (without the `VITE_` prefix). Set these to
the same values as their `VITE_` counterparts.

| Server variable              | Same value as                     |
| ---------------------------- | --------------------------------- |
| `SUPABASE_URL`               | `VITE_SUPABASE_URL`               |
| `SUPABASE_PUBLISHABLE_KEY`   | `VITE_SUPABASE_PUBLISHABLE_KEY`   |