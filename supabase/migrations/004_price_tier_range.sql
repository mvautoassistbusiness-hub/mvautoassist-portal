-- ============================================================
-- 004_price_tier_range.sql
-- Enforce RSA price tiers must be between ₹500 and ₹5000.
-- Pre-checked: zero existing rows outside this range.
-- ============================================================

ALTER TABLE public.price_tiers
  ADD CONSTRAINT price_tiers_amount_range
  CHECK (amount >= 500 AND amount <= 5000);
