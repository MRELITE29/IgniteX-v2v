GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guardian_contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.safety_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.threat_scans TO authenticated;

GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.guardian_contacts TO service_role;
GRANT ALL ON public.safety_sessions TO service_role;
GRANT ALL ON public.incidents TO service_role;
GRANT ALL ON public.threat_scans TO service_role;