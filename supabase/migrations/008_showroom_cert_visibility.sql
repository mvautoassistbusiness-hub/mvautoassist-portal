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
--     their own certs, because the EXISTS subquery short-circuits
--     on the IS NOT NULL check.
--   • Admin access is unchanged.
-- ============================================================

-- Index on users.showroom_id so the RLS EXISTS subquery is fast
CREATE INDEX IF NOT EXISTS idx_users_showroom_id
  ON public.users (showroom_id)
  WHERE showroom_id IS NOT NULL;

-- Replace the SELECT-only policy
DROP POLICY IF EXISTS "certificates_select" ON public.certificates;

CREATE POLICY "certificates_select" ON public.certificates
  FOR SELECT TO authenticated
  USING (
    -- 1. Admins see everything
    is_admin()

    -- 2. Dealers always see their own certs
    OR agent_id = auth.uid()

    -- 3. Showroom-shared: the cert's issuing agent is in the same
    --    non-null showroom as the current user.
    --    Short-circuits to false when auth.uid() has no showroom.
    OR EXISTS (
      SELECT 1
      FROM   public.users  me
      JOIN   public.users  issuer ON issuer.id = certificates.agent_id
      WHERE  me.id          = auth.uid()
        AND  me.showroom_id IS NOT NULL
        AND  me.showroom_id = issuer.showroom_id
    )
  );
