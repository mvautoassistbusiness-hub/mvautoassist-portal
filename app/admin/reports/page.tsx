import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import ReportsView, { type ReportCert, type AgentOption } from '@/components/admin/ReportsView';

export const metadata: Metadata = {
  title: 'Reports · MVAutoAssist Admin',
};

export default async function ReportsPage() {
  const supabase = await createClient();

  const [{ data: certData, error: e1 }, { data: userData, error: e2 }] = await Promise.all([
    supabase
      .from('certificates')
      .select(`
        id,
        cert_number,
        customer_name,
        make_model,
        vehicle_type,
        rsa_amount,
        status,
        created_at,
        agent:users!certificates_agent_id_fkey(id, full_name, location)
      `)
      .order('created_at', { ascending: false }),

    supabase
      .from('users')
      .select('id, full_name, location')
      .eq('role', 'dealer')
      .order('full_name', { ascending: true }),
  ]);

  if (e1) console.error('[ReportsPage] certs:', e1);
  if (e2) console.error('[ReportsPage] users:', e2);

  const certs = (certData ?? []) as unknown as ReportCert[];
  const agents = (userData ?? []) as AgentOption[];

  return <ReportsView certs={certs} agents={agents} />;
}
