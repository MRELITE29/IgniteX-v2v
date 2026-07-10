-- Add latitude and longitude columns to safety_sessions and incidents tables
-- to support real-time location intelligence.

ALTER TABLE public.safety_sessions 
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.incidents 
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;
