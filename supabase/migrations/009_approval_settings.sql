-- ============================================================
-- 009_approval_settings.sql
--
-- Phase C: per-dealer daily auto-approval limit
--
-- Mirrors the helpline_settings pattern:
--   • One global default row (user_id = NULL, is_default = true)
--   • Optional per-dealer override row (user_id = dealer uuid)
-- ============================================================

CREATE TABLE public.approval_settings (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES public.users(id) ON DELETE CASCADE,
  daily_limit integer     NOT NULL CHECK (daily_limit >= 0),
  is_default  boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT approval_settings_pkey PRIMARY KEY (id)
);

-- At most one override per dealer
CREATE UNIQUE INDEX uq_approval_settings_user
  ON public.approval_settings (user_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.approval_settings ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "admins_manage_approval_settings" ON public.approval_settings
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- Dealers can read their own override + the global default
CREATE POLICY "dealers_read_approval_limit" ON public.approval_settings
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND is_default = true)
  );

-- Global default: 10 certs auto-approved per dealer per IST day
INSERT INTO public.approval_settings (user_id, daily_limit, is_default)
VALUES (NULL, 10, true);
