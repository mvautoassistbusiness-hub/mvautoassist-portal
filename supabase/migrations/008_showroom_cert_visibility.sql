-- ============================================================
-- 008_showroom_cert_visibility.sql
--
-- Phase A: shared showroom certificate visibility (VIEW-ONLY)
--
-- Replaces the certificates_select policy so a dealer can also
-- see certs issued by colleagues in the same showroom.
--
-- Security invariants kept:
--   • UPDATE/INSERT/DELETE policies are NOT touched — dealers can
--     still only UPDATE/DELETE their own certs (agent_id = auth.uid()).
--   • Dealers with no showroom (showroom_id IS NULL) see only
--     their own certs, because shares_showroom() short-circuits
--     on the IS NOT NULL check.
--   • Admin access is unchanged.
--
-- NOTE: The helper function uses SECURITY DEFINER so the subquery
-- can read other users' showroom_id without being blocked by the
-- users table's own RLS (same pattern as is_admin()).
-- ============================================================

-- Index on users.showroom_id so the RLS EXISTS subquery is fast
CREATE INDEX IF NOT EXISTS idx_users_showroom_id
  ON public.users (showroom_id)
  WHERE showroom_id IS NOT NULL;

-- Helper: does the current user share a showroom with the given agent?
-- SECURITY DEFINER bypasses users-table RLS (same pattern as is_admin).
CREATE OR REPLACE FUNCTION public.shares_showroom(cert_agent_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.users  me
    JOIN   public.users  issuer ON issuer.id = cert_agent_id
    WHERE  me.id          = auth.uid()
      AND  me.showroom_id IS NOT NULL
      AND  me.showroom_id = issuer.showroom_id
  );
$$;

-- Replace the SELECT-only policy
DROP POLICY IF EXISTS "certificates_select" ON public.certificates;

CREATE POLICY "certificates_select" ON public.certificates
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR agent_id = auth.uid()
    OR shares_showroom(agent_id)
  );

-- Allow dealers to see showroom-mates' user rows (needed for the
-- "by <name>" issuer badge on shared certs via PostgREST join).
-- PostgreSQL OR's multiple SELECT policies, so the existing
-- self-visibility policy (id = auth.uid()) stays intact.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users' AND policyname = 'users_showroom_visibility'
  ) THEN
    CREATE POLICY "users_showroom_visibility" ON public.users
      FOR SELECT TO authenticated
      USING (shares_showroom(id));
  END IF;
END $$;
