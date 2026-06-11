import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import CertificatesGrid, { type CertCard } from '@/components/agent/CertificatesGrid';

export const metadata: Metadata = {
  title: 'My Certificates · MVAutoAssist',
};

export default async function AgentCertificatesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // RLS enforces agent_id = auth.uid() — no manual filter needed
  const { data, error } = await supabase
    .from('certificates')
    .select('id, cert_number, customer_name, make_model, vehicle_type, rsa_amount, total_amount, status, end_date, payment_received')
    .order('created_at', { ascending: false });

  if (error) console.error('[AgentCertificates]', error);

  const certs = (data ?? []) as CertCard[];

  // "Issued" = approved by admin. RSA revenue = sum of approved certs only.
  const issuedCount = certs.filter(c => c.status === 'approved').length;
  const rsaRevenue  = certs
    .filter(c => c.status === 'approved')
    .reduce((s: number, c) => s + (c.rsa_amount ?? 0), 0);

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 lg:px-10 py-5 border-b border-stone-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="lg:hidden w-9 shrink-0" />
          <div>
            <h1
              style={{ fontFamily: "'Instrument Serif', serif" }}
              className="text-3xl tracking-tight leading-none"
            >
              My Certificates
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              {issuedCount} issued
              {rsaRevenue > 0 && (
                <> · ₹{rsaRevenue.toLocaleString('en-IN')} approved RSA revenue</>
            )}
            </p>
          </div>
        </div>
        <Link
          href="/agent/certificates/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)' }}
        >
          <Plus className="w-4 h-4" />
          New certificate
        </Link>
      </div>

      <CertificatesGrid certs={certs} />
    </>
  );
}
