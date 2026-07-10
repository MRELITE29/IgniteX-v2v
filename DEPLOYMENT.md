# SafeSphere — Deployment Guide (GitHub + Vercel)

SafeSphere is a TanStack Start (React 19 + Vite) app with a Supabase backend and
a server-side Google Gemini integration. It is fully portable — all
configuration comes from environment variables.

---

## 1. Prerequisites

- A Supabase project (existing — do **not** create a new one if you already have
  the SafeSphere tables). See `DATABASE.md` for the schema.
- A Google Gemini API key from https://aistudio.google.com/app/apikey
- A GitHub repository and a Vercel account.

## 2. Environment variables

Configure these (see `ENVIRONMENT.md` for details):

| Variable                        | Scope        | Example                                  |
| ------------------------------- | ------------ | ---------------------------------------- |
| `VITE_SUPABASE_URL`             | Client       | `https://xxxx.supabase.co`               |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client       | `sb_publishable_...`                     |
| `GEMINI_API_KEY`                | Server only  | `AIza...`                                |
| `VITE_APP_URL`                  | Client       | `https://safesphere.vercel.app`          |
| `SUPABASE_URL`                  | Server       | same as `VITE_SUPABASE_URL`              |
| `SUPABASE_PUBLISHABLE_KEY`      | Server       | same as `VITE_SUPABASE_PUBLISHABLE_KEY`  |

## 3. Supabase setup

1. Ensure the five tables exist: `profiles`, `guardian_contacts`,
   `safety_sessions`, `incidents`, `threat_scans` (see `DATABASE.md`).
2. Confirm RLS is enabled with owner policies (`auth.uid() = user_id`) on each.
3. Under Authentication → Providers, enable **Email**.
4. Under Authentication → URL Configuration, add your production URL and
   `<your-app-url>/reset-password` to the redirect allow-list so email
   verification and password reset links work.

## 4. Build commands

```bash
npm install      # install dependencies
npm run dev      # local development
npm run build    # production build
```

## 5. Deploy to Vercel

1. Push the repository to GitHub.
2. In Vercel: **New Project → Import** your GitHub repo.
3. Framework preset: **Vite** (or leave auto-detected).
4. Add every environment variable from step 2 in
   **Project Settings → Environment Variables**.
5. Deploy. Vercel runs `npm install` then `npm run build` automatically.
6. After the first deploy, set `VITE_APP_URL` to the assigned URL and update the
   Supabase redirect allow-list (step 3.4), then redeploy.

## 6. Post-deploy checklist

- [ ] Sign up / log in / log out works
- [ ] Password reset email arrives and updates the password
- [ ] Profile + Guardian contacts save (create/read/update/delete)
- [ ] Guardian Shield computes a route safety score
- [ ] AI Threat Scanner returns a result (uses Gemini; falls back if unset)