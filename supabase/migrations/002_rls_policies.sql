-- ============================================================
-- 002_rls_policies.sql
-- MVAutoAssist Portal — Row Level Security Policies
-- ============================================================


-- ============================================================
-- HELPER FUNCTION: is_admin()
-- Reads public.users to check if the current session user has
-- role = 'admin'. SECURITY DEFINER is required so it runs as
-- the function owner (bypassing users' own RLS), preventing
-- an infinite loop: users RLS → is_admin() → users RLS.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;


-- ============================================================
-- STEP 1: Ensure RLS is ON for all 4 tables
-- ============================================================
ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_tiers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpline_settings  ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- STEP 2: Drop old policies (makes this script re-runnable)
-- ============================================================
DROP POLICY IF EXISTS "users_select_own_or_admin"      ON public.users;
DROP POLICY IF EXISTS "admins_insert_users"             ON public.users;
DROP POLICY IF EXISTS "admins_update_users"             ON public.users;
DROP POLICY IF EXISTS "admins_delete_users"             ON public.users;

DROP POLICY IF EXISTS "certificates_select"             ON public.certificates;
DROP POLICY IF EXISTS "certificates_insert"             ON public.certificates;
DROP POLICY IF EXISTS "dealers_update_certificates"     ON public.certificates;
DROP POLICY IF EXISTS "admins_update_certificates"      ON public.certificates;
DROP POLICY IF EXISTS "admins_delete_certificates"      ON public.certificates;

DROP POLICY IF EXISTS "price_tiers_select_own_or_admin" ON public.price_tiers;
DROP POLICY IF EXISTS "admins_insert_price_tiers"       ON public.price_tiers;
DROP POLICY IF EXISTS "admins_update_price_tiers"       ON public.price_tiers;
DROP POLICY IF EXISTS "admins_delete_price_tiers"       ON public.price_tiers;

DROP POLICY IF EXISTS "helpline_select_authenticated"   ON public.helpline_settings;
DROP POLICY IF EXISTS "admins_insert_helpline"          ON public.helpline_settings;
DROP POLICY IF EXISTS "admins_update_helpline"          ON public.helpline_settings;
DROP POLICY IF EXISTS "admins_delete_helpline"          ON public.helpline_settings;


-- ============================================================
-- TABLE: users
-- ============================================================
CREATE POLICY "users_select_own_or_admin"
  ON public.users FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_admin());

CREATE POLICY "admins_insert_users"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "admins_update_users"
  ON public.users FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admins_delete_users"
  ON public.users FOR DELETE TO authenticated
  USING (is_admin());


-- ============================================================
-- TABLE: certificates
-- ============================================================
CREATE POLICY "certificates_select"
  ON public.certificates FOR SELECT TO authenticated
  USING (agent_id = auth.uid() OR is_admin());

CREATE POLICY "certificates_insert"
  ON public.certificates FOR INSERT TO authenticated
  WITH CHECK (agent_id = auth.uid() OR is_admin());

-- Dealers: can edit their own rows, but status must not change.
-- WITH CHECK subquery reads the stored status before the UPDATE
-- and requires the new value to match it exactly.
CREATE POLICY "dealers_update_certificates"
  ON public.certificates FOR UPDATE TO authenticated
  USING (agent_id = auth.uid() AND NOT is_admin())
  WITH CHECK (
    agent_id = auth.uid() AND
    status = (
      SELECT c.status FROM public.certificates c WHERE c.id = certificates.id
    )
  );

-- Admins: unrestricted UPDATE including status transitions
-- (pending → approved / rejected).
CREATE POLICY "admins_update_certificates"
  ON public.certificates FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admins_delete_certificates"
  ON public.certificates FOR DELETE TO authenticated
  USING (is_admin());


-- ============================================================
-- TABLE: price_tiers
-- ============================================================
CREATE POLICY "price_tiers_select_own_or_admin"
  ON public.price_tiers FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "admins_insert_price_tiers"
  ON public.price_tiers FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "admins_update_price_tiers"
  ON public.price_tiers FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admins_delete_price_tiers"
  ON public.price_tiers FOR DELETE TO authenticated
  USING (is_admin());


-- ============================================================
-- TABLE: helpline_settings
-- ============================================================
CREATE POLICY "helpline_select_authenticated"
  ON public.helpline_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admins_insert_helpline"
  ON public.helpline_settings FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "admins_update_helpline"
  ON public.helpline_settings FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admins_delete_helpline"
  ON public.helpline_settings FOR DELETE TO authenticated
  USING (is_admin());


-- ============================================================
-- VERIFICATION: list all policies on these 4 tables
-- ============================================================
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users','certificates','price_tiers','helpline_settings')
ORDER BY tablename, cmd;
