-- Evidence items table
-- Stores metadata ONLY — never raw video/audio/image binary data.
-- Actual files would be stored in Supabase Storage (future integration).
-- The `storage_path` column holds the Storage bucket path for future use.

CREATE TABLE IF NOT EXISTS public.evidence_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  incident_id  uuid REFERENCES public.incidents(id) ON DELETE SET NULL,
  -- Human-readable original filename (e.g. "audio_20260710_192300.webm")
  filename     text NOT NULL,
  -- MIME type (e.g. "audio/webm", "video/webm", "image/jpeg", "text/plain")
  file_type    text NOT NULL,
  -- File size in bytes (populated when file is uploaded to storage)
  size_bytes   bigint,
  -- Future: Supabase Storage path — null until file is actually uploaded
  storage_path text,
  -- Linked session for context
  session_id   uuid REFERENCES public.safety_sessions(id) ON DELETE SET NULL,
  -- Soft-delete / encryption status
  is_encrypted boolean NOT NULL DEFAULT false,
  is_locked    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Owner-only access via RLS (mirrors all other tables in this schema).
ALTER TABLE public.evidence_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evidence_items owner all" ON public.evidence_items
  FOR ALL TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_items TO authenticated;
GRANT ALL ON public.evidence_items TO service_role;
