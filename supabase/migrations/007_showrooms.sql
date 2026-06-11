-- ============================================================
-- 007_showrooms.sql
-- Multi-dealer Showroom model
--
-- New table: public.showrooms  (id, name, join_code, created_at)
-- New column: public.users.showroom_id  (nullable FK → showrooms)
-- RLS:  admins manage showrooms; dealers read only their own.
-- ============================================================

-- ── Showrooms table ──────────────────────────────────────────
CREATE TABLE public.showrooms (
  id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text         NOT NULL,
  join_code  text         NOT NULL UNIQUE,
  created_at timestamptz  NOT NULL DEFAULT now()
);

-- ── Add showroom_id to users ─────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN showroom_id uuid
  REFERENCES public.showrooms(id) ON DELETE SET NULL;

-- ── Enable RLS on showrooms ───────────────────────────────────
ALTER TABLE public.showrooms ENABLE ROW LEVEL SECURITY;

-- Admins can perform any operation on showrooms
CREATE POLICY "admins_all_showrooms" ON public.showrooms
  FOR ALL TO authenticated
  USING  (is_admin())
  WITH CHECK (is_admin());

-- Dealers can read only the showroom they belong to
CREATE POLICY "dealers_read_own_showroom" ON public.showrooms
  FOR SELECT TO authenticated
  USING (
    id = (
      SELECT showroom_id
      FROM   public.users
      WHERE  id = auth.uid()
    )
  );
