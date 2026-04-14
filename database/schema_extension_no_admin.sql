-- Bokopano Schema Extension (No Admin Roles)
-- Apply AFTER database/schema.sql
-- Purpose:
-- 1) Keep host/volunteer registrations visible in Supabase tables
-- 2) Auto-create profile rows for all users
-- 3) Auto-create volunteer/host rows from account_type metadata

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1) Account type enum
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
    CREATE TYPE account_type AS ENUM ('volunteer', 'host');
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 2) Shared profiles table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  country TEXT,
  avatar_url TEXT,
  account_type account_type DEFAULT 'volunteer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON profiles(account_type);

-- -----------------------------------------------------------------------------
-- 3) Volunteers table
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'volunteer_status') THEN
    CREATE TYPE volunteer_status AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS volunteers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status volunteer_status NOT NULL DEFAULT 'ACTIVE',
  bio TEXT,
  availability TEXT,
  skills TEXT[],
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_volunteers_user_id ON volunteers(user_id);
CREATE INDEX IF NOT EXISTS idx_volunteers_status ON volunteers(status);

-- -----------------------------------------------------------------------------
-- 4) updated_at trigger helper
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_volunteers_updated_at') THEN
    CREATE TRIGGER update_volunteers_updated_at
      BEFORE UPDATE ON volunteers
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 5) Auto-create profile + host/volunteer rows from auth.users
-- -----------------------------------------------------------------------------
-- Replaces/standardizes any existing auth-user trigger with no-admin behavior.
DROP TRIGGER IF EXISTS on_auth_user_created_bokopano ON auth.users;

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta JSONB;
  inferred_account_type account_type;
  existing_host_id UUID;
  derived_full_name TEXT;
  derived_first_name TEXT;
  derived_last_name TEXT;
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  derived_full_name := COALESCE(meta->>'full_name', '');
  derived_first_name := COALESCE(meta->>'first_name', split_part(derived_full_name, ' ', 1));
  derived_last_name := COALESCE(
    meta->>'last_name',
    NULLIF(regexp_replace(derived_full_name, '^\S+\s*', ''), '')
  );

  inferred_account_type := CASE
    WHEN LOWER(COALESCE(meta->>'account_type', 'volunteer')) = 'host' THEN 'host'::account_type
    ELSE 'volunteer'::account_type
  END;

  INSERT INTO public.profiles (user_id, first_name, last_name, full_name, email, country, account_type)
  VALUES (
    NEW.id,
    derived_first_name,
    derived_last_name,
    derived_full_name,
    NEW.email,
    COALESCE(meta->>'country', ''),
    inferred_account_type
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    country = EXCLUDED.country,
    account_type = EXCLUDED.account_type,
    updated_at = NOW();

  IF inferred_account_type = 'volunteer' THEN
    INSERT INTO public.volunteers (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  IF inferred_account_type = 'host' THEN
    SELECT h.id INTO existing_host_id
    FROM public.hosts h
    WHERE h.user_id = NEW.id
    LIMIT 1;

    IF existing_host_id IS NULL THEN
      INSERT INTO public.hosts (user_id, status)
      VALUES (NEW.id, 'DRAFT');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_bokopano
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_auth_user();

DROP TRIGGER IF EXISTS on_auth_user_email_updated_bokopano ON auth.users;

CREATE OR REPLACE FUNCTION sync_profile_email_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email,
      updated_at = NOW()
  WHERE user_id = NEW.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_email_updated_bokopano
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_email_from_auth();

-- -----------------------------------------------------------------------------
-- 6) Backfill existing users
-- -----------------------------------------------------------------------------
INSERT INTO profiles (user_id, first_name, last_name, full_name, email, country, account_type)
SELECT
  u.id,
  COALESCE(
    u.raw_user_meta_data->>'first_name',
    split_part(COALESCE(u.raw_user_meta_data->>'full_name', ''), ' ', 1)
  ),
  COALESCE(
    u.raw_user_meta_data->>'last_name',
    NULLIF(regexp_replace(COALESCE(u.raw_user_meta_data->>'full_name', ''), '^\S+\s*', ''), '')
  ),
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  u.email,
  COALESCE(u.raw_user_meta_data->>'country', ''),
  CASE
    WHEN LOWER(COALESCE(u.raw_user_meta_data->>'account_type', 'volunteer')) = 'host' THEN 'host'::account_type
    ELSE 'volunteer'::account_type
  END
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO volunteers (user_id)
SELECT p.user_id
FROM profiles p
WHERE p.account_type = 'volunteer'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO hosts (user_id, status)
SELECT p.user_id, 'DRAFT'::host_status
FROM profiles p
LEFT JOIN hosts h ON h.user_id = p.user_id
WHERE p.account_type = 'host'
  AND h.id IS NULL;

-- -----------------------------------------------------------------------------
-- 7) RLS for profiles + volunteers (self-access only)
-- -----------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Profiles self read'
  ) THEN
    CREATE POLICY "Profiles self read"
      ON profiles FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Profiles self insert'
  ) THEN
    CREATE POLICY "Profiles self insert"
      ON profiles FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Profiles self update'
  ) THEN
    CREATE POLICY "Profiles self update"
      ON profiles FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'volunteers' AND policyname = 'Volunteers self read'
  ) THEN
    CREATE POLICY "Volunteers self read"
      ON volunteers FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'volunteers' AND policyname = 'Volunteers self insert'
  ) THEN
    CREATE POLICY "Volunteers self insert"
      ON volunteers FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'volunteers' AND policyname = 'Volunteers self update'
  ) THEN
    CREATE POLICY "Volunteers self update"
      ON volunteers FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 8) Simple views so you can quickly confirm records in Supabase
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW host_registrations_overview AS
SELECT
  h.id AS host_id,
  h.user_id,
  p.first_name,
  p.last_name,
  p.full_name,
  p.email,
  p.country,
  h.status,
  h.created_at,
  h.updated_at
FROM hosts h
LEFT JOIN profiles p ON p.user_id = h.user_id;

CREATE OR REPLACE VIEW volunteer_registrations_overview AS
SELECT
  v.id AS volunteer_id,
  v.user_id,
  p.first_name,
  p.last_name,
  p.full_name,
  p.email,
  p.country,
  v.status,
  v.created_at,
  v.updated_at
FROM volunteers v
LEFT JOIN profiles p ON p.user_id = v.user_id;

-- -----------------------------------------------------------------------------
-- 9) Hotfix: valid completion-percentage function for hosts
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_host_completion_percentage()
RETURNS TRIGGER AS $$
DECLARE
  profile_score INTEGER := 0;
  verification_score INTEGER := 0;
  opportunity_score INTEGER := 0;
BEGIN
  IF NEW.status = 'DRAFT' THEN
    IF EXISTS (
      SELECT 1
      FROM host_profiles hp
      WHERE hp.host_id = NEW.id
        AND hp.organization_name IS NOT NULL
        AND hp.description IS NOT NULL
        AND hp.location_country IS NOT NULL
        AND hp.physical_address IS NOT NULL
    ) THEN
      profile_score := 30;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM host_verification hv
      WHERE hv.host_id = NEW.id
        AND hv.id_document_url IS NOT NULL
        AND hv.proof_of_address_url IS NOT NULL
    ) THEN
      verification_score := 40;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM host_opportunities ho
      WHERE ho.host_id = NEW.id
    ) THEN
      opportunity_score := 30;
    END IF;

    NEW.completion_percentage := profile_score + verification_score + opportunity_score;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
