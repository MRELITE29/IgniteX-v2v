// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// ---------------------------------------------------------------------------
// Supabase credentials are read entirely from environment variables so the app
// is fully portable (GitHub + Vercel + self-host). No project IDs, URLs, or
// keys are hardcoded here.
//
//   Browser client  → import.meta.env.VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
//   Server runtime  → process.env.SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY
//
// Configure these in `.env` locally and in your hosting provider's env settings
// for production (see .env.example, ENVIRONMENT.md and DEPLOYMENT.md).
// ---------------------------------------------------------------------------
export default defineConfig({
  nitro: {
    preset: "vercel",
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
