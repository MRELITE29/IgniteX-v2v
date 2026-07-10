ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;

WITH grouped AS (
  SELECT
    user_id,
    (array_agg(id ORDER BY
      (
        CASE WHEN nullif(trim(full_name), '') IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN nullif(trim(phone), '') IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN nullif(trim(email), '') IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN nullif(trim(address), '') IS NOT NULL THEN 1 ELSE 0 END
      ) DESC,
      created_at DESC,
      id
    ))[1] AS keep_id,
    (array_agg(nullif(trim(full_name), '') ORDER BY (nullif(trim(full_name), '') IS NOT NULL) DESC, created_at DESC))[1] AS full_name,
    (array_agg(nullif(trim(phone), '') ORDER BY (nullif(trim(phone), '') IS NOT NULL) DESC, created_at DESC))[1] AS phone,
    (array_agg(nullif(trim(email), '') ORDER BY (nullif(trim(email), '') IS NOT NULL) DESC, created_at DESC))[1] AS email,
    (array_agg(nullif(trim(address), '') ORDER BY (nullif(trim(address), '') IS NOT NULL) DESC, created_at DESC))[1] AS address
  FROM public.profiles
  GROUP BY user_id
  HAVING count(*) > 1
),
merged AS (
  UPDATE public.profiles profiles
  SET
    full_name = COALESCE(grouped.full_name, profiles.full_name),
    phone = COALESCE(grouped.phone, profiles.phone),
    email = COALESCE(grouped.email, profiles.email),
    address = COALESCE(grouped.address, profiles.address)
  FROM grouped
  WHERE profiles.id = grouped.keep_id
  RETURNING profiles.id
)
DELETE FROM public.profiles profiles
USING grouped
WHERE profiles.user_id = grouped.user_id
  AND profiles.id <> grouped.keep_id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_user_id_key'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
