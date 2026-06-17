-- ============================================================
-- 010_must_change_password.sql
--
-- Phase D: forced password-change flag for dealers
--
-- Set to true by admin when resetting a dealer's password.
-- Cleared by the dealer after setting their new password.
-- Admins (real Gmail accounts) are unaffected.
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
