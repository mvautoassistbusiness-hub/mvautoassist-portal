import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import PaymentsLedger, { type PaymentRow } from '@/components/admin/PaymentsLedger';

export const metadata: Metadata = {
  title: 'Payments · MVAutoAssist Admin',
};

export default async function PaymentsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('certificates')
    .select(`
      id,
      cert_number,
      customer_name,
      rsa_amount,
      total_amount,
      payment_method,
      payment_reference,
      payment_received,
      status,
      created_at,
      agent:users!certificates_agent_id_fkey(full_name)
    `)
    .order('created_at', { ascending: false });

  if (error) console.error('[PaymentsPage]', error);

  const payments = (data ?? []) as unknown as PaymentRow[];

  return <PaymentsLedger payments={payments} />;
}
