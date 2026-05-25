-- ============================================================
-- 005_payment_fields.sql
-- Add payment_method, payment_reference, payment_received to
-- public.certificates. Column order matters: payment_received
-- must exist before the dealer UPDATE policy references it.
-- ============================================================

-- 1. Add payment columns first (policy below references payment_received)
alter table public.certificates
  add column if not exists payment_method    text,
  add column if not exists payment_reference text,
  add column if not exists payment_received  boolean not null default false;

-- 2. Constrain payment_method to the allowed set (nullable for legacy certs)
alter table public.certificates
  add constraint certificates_payment_method_check
  check (payment_method is null or payment_method in ('cash','upi','card','cheque','bank_transfer'));

-- 3. Recreate dealer UPDATE policy to ALSO pin payment_received to its stored
--    value, so dealers cannot self-confirm via direct PostgREST calls.
drop policy if exists "dealers_update_certificates" on public.certificates;
create policy "dealers_update_certificates"
  on public.certificates for update to authenticated
  using (agent_id = auth.uid() and not is_admin())
  with check (
    agent_id = auth.uid()
    and status = (select c.status from public.certificates c where c.id = certificates.id)
    and coalesce(payment_received, false) = coalesce(
      (select c.payment_received from public.certificates c where c.id = certificates.id),
      false
    )
  );
