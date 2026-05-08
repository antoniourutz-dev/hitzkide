CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  display_name text,
  current_level text NOT NULL DEFAULT 'B1',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_progress_snapshots (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  schema_version integer NOT NULL DEFAULT 1,
  progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_level text NOT NULL DEFAULT 'B1',
  total_sessions integer NOT NULL DEFAULT 0,
  total_answers integer NOT NULL DEFAULT 0,
  total_correct integer NOT NULL DEFAULT 0,
  accuracy numeric(5,2) NOT NULL DEFAULT 0,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.client_observability_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  installation_id text NOT NULL,
  app_version text NOT NULL,
  event_name text NOT NULL,
  category text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_progress_snapshots_updated_at
  ON public.user_progress_snapshots (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_observability_events_user_id_created_at
  ON public.client_observability_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_observability_events_category_created_at
  ON public.client_observability_events (category, created_at DESC);

DROP TRIGGER IF EXISTS set_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER set_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS set_user_progress_snapshots_updated_at ON public.user_progress_snapshots;
CREATE TRIGGER set_user_progress_snapshots_updated_at
BEFORE UPDATE ON public.user_progress_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_observability_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;
CREATE POLICY "user_profiles_select_own"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "user_profiles_upsert_own" ON public.user_profiles;
CREATE POLICY "user_profiles_upsert_own"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;
CREATE POLICY "user_profiles_update_own"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "progress_select_own" ON public.user_progress_snapshots;
CREATE POLICY "progress_select_own"
ON public.user_progress_snapshots
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "progress_insert_own" ON public.user_progress_snapshots;
CREATE POLICY "progress_insert_own"
ON public.user_progress_snapshots
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "progress_update_own" ON public.user_progress_snapshots;
CREATE POLICY "progress_update_own"
ON public.user_progress_snapshots
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "observability_insert_authenticated" ON public.client_observability_events;
CREATE POLICY "observability_insert_authenticated"
ON public.client_observability_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "observability_select_own" ON public.client_observability_events;
CREATE POLICY "observability_select_own"
ON public.client_observability_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
