import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CertificatesTable, { type CertRow } from '@/components/admin/CertificatesTable';

export const metadata: Metadata = {
  title: 'Certificates · MVAutoAssist Admin',
};

export default async function CertificatesPage() {
  const supabase = await createClient();

  // Auth is already guarded by app/admin/layout.tsx, but verify role here too
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch all certificates, join agent name via the agent_id FK
  const { data, error } = await supabase
    .from('certificates')
    .select(`
      id,
      cert_number,
      customer_name,
      customer_mobile,
      make_model,
      vehicle_type,
      total_amount,
      status,
      created_at,
      chassis_no,
      payment_method,
      payment_reference,
      payment_received,
      agent:users!certificates_agent_id_fkey(full_name)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[CertificatesPage]', error);
  }

  // Supabase infers the FK join as array[]; at runtime it is {full_name} | null.
  const certs = (data ?? []) as unknown as CertRow[];

  return <CertificatesTable certs={certs} />;
}
