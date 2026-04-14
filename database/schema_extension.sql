-- Bokopano Schema Extension (Non-Breaking)
-- Apply AFTER database/schema.sql in Supabase SQL Editor.
-- This script is idempotent where possible and designed to preserve existing behavior.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1) Enums for user/account modeling
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
    CREATE TYPE account_type AS ENUM ('volunteer', 'host', 'admin');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
    CREATE TYPE admin_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MODERATOR');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'volunteer_status') THEN
    CREATE TYPE volunteer_status AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
    CREATE TYPE application_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 2) Core identity/profile tables used across host + volunteer + admin
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  country TEXT,
  avatar_url TEXT,
  account_type account_type DEFAULT 'volunteer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role admin_role NOT NULL DEFAULT 'ADMIN',
  can_review_hosts BOOLEAN NOT NULL DEFAULT TRUE,
  can_manage_volunteers BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3) Keep legacy table compatible, improve constraints for applications
-- -----------------------------------------------------------------------------
ALTER TABLE host_applications
  ALTER COLUMN status TYPE application_status
  USING (status::application_status);

ALTER TABLE host_applications
  ADD COLUMN IF NOT EXISTS volunteer_id UUID REFERENCES volunteers(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'host_applications_unique_user_per_opportunity'
  ) THEN
    ALTER TABLE host_applications
      ADD CONSTRAINT host_applications_unique_user_per_opportunity
      UNIQUE (opportunity_id, user_id);
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 4) Indexes for admin dashboards + app performance
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON profiles(account_type);
CREATE INDEX IF NOT EXISTS idx_volunteers_user_id ON volunteers(user_id);
CREATE INDEX IF NOT EXISTS idx_volunteers_status ON volunteers(status);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_host_applications_volunteer_id ON host_applications(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_host_opportunities_created_at ON host_opportunities(created_at DESC);

-- -----------------------------------------------------------------------------
-- 5) Timestamp trigger helper reuse
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
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_volunteers_updated_at'
  ) THEN
    CREATE TRIGGER update_volunteers_updated_at
      BEFORE UPDATE ON volunteers
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_admin_users_updated_at'
  ) THEN
    CREATE TRIGGER update_admin_users_updated_at
      BEFORE UPDATE ON admin_users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 6) Auto-sync profiles/volunteers/admin from auth.users metadata
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta JSONB;
  inferred_account_type account_type;
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  inferred_account_type := CASE
    WHEN LOWER(COALESCE(meta->>'account_type', 'volunteer')) = 'host' THEN 'host'::account_type
    WHEN LOWER(COALESCE(meta->>'account_type', 'volunteer')) = 'admin' THEN 'admin'::account_type
    ELSE 'volunteer'::account_type
  END;

  INSERT INTO public.profiles (user_id, full_name, email, country, account_type)
  VALUES (
    NEW.id,
    COALESCE(meta->>'full_name', ''),
    NEW.email,
    COALESCE(meta->>'country', ''),
    inferred_account_type
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
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

  IF inferred_account_type = 'admin' THEN
    INSERT INTO public.admin_users (user_id, role)
    VALUES (NEW.id, 'ADMIN')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created_bokopano'
  ) THEN
    CREATE TRIGGER on_auth_user_created_bokopano
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_auth_user();
  END IF;
END
$$;

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_email_updated_bokopano'
  ) THEN
    CREATE TRIGGER on_auth_user_email_updated_bokopano
      AFTER UPDATE OF email ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION sync_profile_email_from_auth();
  END IF;
END
$$;

-- Backfill for existing auth users
INSERT INTO profiles (user_id, full_name, email, country, account_type)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  u.email,
  COALESCE(u.raw_user_meta_data->>'country', ''),
  CASE
    WHEN LOWER(COALESCE(u.raw_user_meta_data->>'account_type', 'volunteer')) = 'host' THEN 'host'::account_type
    WHEN LOWER(COALESCE(u.raw_user_meta_data->>'account_type', 'volunteer')) = 'admin' THEN 'admin'::account_type
    ELSE 'volunteer'::account_type
  END
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO volunteers (user_id)
SELECT p.user_id
FROM profiles p
WHERE p.account_type = 'volunteer'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO admin_users (user_id, role)
SELECT p.user_id, 'ADMIN'::admin_role
FROM profiles p
WHERE p.account_type = 'admin'
ON CONFLICT (user_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 7) RLS policies
-- -----------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Profiles self or admin can read'
  ) THEN
    CREATE POLICY "Profiles self or admin can read"
      ON profiles FOR SELECT
      USING (
        auth.uid() = user_id
        OR EXISTS (
          SELECT 1 FROM admin_users a
          WHERE a.user_id = auth.uid() AND a.is_active = TRUE
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Profiles self can update'
  ) THEN
    CREATE POLICY "Profiles self can update"
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
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Profiles self can insert'
  ) THEN
    CREATE POLICY "Profiles self can insert"
      ON profiles FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- Volunteers policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'volunteers' AND policyname = 'Volunteers self or admin can read'
  ) THEN
    CREATE POLICY "Volunteers self or admin can read"
      ON volunteers FOR SELECT
      USING (
        auth.uid() = user_id
        OR EXISTS (
          SELECT 1 FROM admin_users a
          WHERE a.user_id = auth.uid() AND a.is_active = TRUE
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'volunteers' AND policyname = 'Volunteers self can insert'
  ) THEN
    CREATE POLICY "Volunteers self can insert"
      ON volunteers FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'volunteers' AND policyname = 'Volunteers self can update'
  ) THEN
    CREATE POLICY "Volunteers self can update"
      ON volunteers FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- Admin users policies (locked down)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'admin_users' AND policyname = 'Admin users can read own admin row'
  ) THEN
    CREATE POLICY "Admin users can read own admin row"
      ON admin_users FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Host applications policies (missing in base schema)
ALTER TABLE host_applications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'host_applications' AND policyname = 'Applicants can read own applications'
  ) THEN
    CREATE POLICY "Applicants can read own applications"
      ON host_applications FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'host_applications' AND policyname = 'Hosts can read applications for own opportunities'
  ) THEN
    CREATE POLICY "Hosts can read applications for own opportunities"
      ON host_applications FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM host_opportunities o
          JOIN hosts h ON h.id = o.host_id
          WHERE o.id = host_applications.opportunity_id
            AND h.user_id = auth.uid()
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'host_applications' AND policyname = 'Admins can read all applications'
  ) THEN
    CREATE POLICY "Admins can read all applications"
      ON host_applications FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM admin_users a
          WHERE a.user_id = auth.uid() AND a.is_active = TRUE
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'host_applications' AND policyname = 'Volunteers can apply to active approved opportunities'
  ) THEN
    CREATE POLICY "Volunteers can apply to active approved opportunities"
      ON host_applications FOR INSERT
      WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
          SELECT 1
          FROM host_opportunities o
          JOIN hosts h ON h.id = o.host_id
          WHERE o.id = host_applications.opportunity_id
            AND o.status = 'active'
            AND h.status = 'APPROVED'
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'host_applications' AND policyname = 'Applicants can update own applications'
  ) THEN
    CREATE POLICY "Applicants can update own applications"
      ON host_applications FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'host_applications' AND policyname = 'Hosts can update applications for own opportunities'
  ) THEN
    CREATE POLICY "Hosts can update applications for own opportunities"
      ON host_applications FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM host_opportunities o
          JOIN hosts h ON h.id = o.host_id
          WHERE o.id = host_applications.opportunity_id
            AND h.user_id = auth.uid()
        )
      )
      WITH CHECK (TRUE);
  END IF;
END
$$;

-- Allow host opportunity creation during host application flow (non-breaking add)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'host_opportunities' AND policyname = 'Hosts can create own opportunities while onboarding'
  ) THEN
    CREATE POLICY "Hosts can create own opportunities while onboarding"
      ON host_opportunities FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM hosts h
          WHERE h.id = host_opportunities.host_id
            AND h.user_id = auth.uid()
        )
      );
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 8) Admin/ops views for deployment dashboards
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW admin_host_registrations AS
SELECT
  h.id AS host_id,
  h.user_id,
  p.full_name,
  p.email,
  p.phone,
  p.country,
  h.status,
  h.completion_percentage,
  hp.organization_name,
  hp.host_type,
  hp.location_city,
  hp.location_country,
  h.created_at,
  h.updated_at
FROM hosts h
LEFT JOIN profiles p ON p.user_id = h.user_id
LEFT JOIN host_profiles hp ON hp.host_id = h.id;

CREATE OR REPLACE VIEW admin_volunteer_registrations AS
SELECT
  v.id AS volunteer_id,
  v.user_id,
  p.full_name,
  p.email,
  p.phone,
  p.country,
  v.status,
  v.bio,
  v.availability,
  v.created_at,
  v.updated_at
FROM volunteers v
LEFT JOIN profiles p ON p.user_id = v.user_id;

CREATE OR REPLACE VIEW public_opportunity_feed AS
SELECT
  o.id,
  o.host_id,
  o.title,
  o.description,
  o.category,
  o.tasks,
  o.duration_weeks,
  o.benefits,
  o.required_skills,
  o.number_of_volunteers,
  o.status,
  o.application_deadline,
  o.start_date,
  o.end_date,
  hp.organization_name,
  hp.location_city,
  hp.location_country,
  o.created_at,
  o.updated_at
FROM host_opportunities o
JOIN hosts h ON h.id = o.host_id
LEFT JOIN host_profiles hp ON hp.host_id = h.id
WHERE h.status = 'APPROVED'
  AND o.status = 'active';
