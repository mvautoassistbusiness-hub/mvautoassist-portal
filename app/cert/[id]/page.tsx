import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import CertificatePreview from '@/components/cert/CertificatePreview';
import type { CertData, AgentData } from '@/components/cert/CertificatePreview';

// ─── dynamic metadata ─────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('certificates')
    .select('cert_number')
    .eq('id', id)
    .single();
  return {
    title: data?.cert_number
      ? `Certificate ${data.cert_number} · MVAutoAssist`
      : 'Certificate · MVAutoAssist',
  };
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function CertPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // ── Auth guard ───────────────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // ── Current user's role (determines Back link) ───────────────────────────
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const backHref = profile?.role === 'admin'
    ? '/admin/certificates'
    : '/agent/certificates';

  // ── Fetch certificate (RLS: dealer sees own, admin sees all) ─────────────
  const { data: certRaw } = await supabase
    .from('certificates')
    .select(`
      id, cert_number,
      customer_name, customer_dob, customer_mobile, customer_email, customer_address,
      vehicle_type, registration_no, make_model, variant,
      engine_no, chassis_no, fuel_type, manufacturing_year,
      start_date, end_date,
      insurance_amount, rsa_amount, total_amount,
      status, agent_id,
      payment_method, payment_reference
    `)
    .eq('id', id)
    .single();

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!certRaw) {
    return (
      <div
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        className="min-h-screen bg-stone-50 flex flex-col"
      >
        <div className="bg-white border-b border-stone-200 px-6 py-4">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-slate-900 transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back
          </Link>
        </div>
        <main className="flex-1 flex items-start justify-center px-6 py-16">
          <div className="w-full max-w-lg bg-white border border-stone-200 rounded-2xl shadow-sm p-10 text-center">
            <p className="text-sm font-semibold text-stone-400 mb-2">Certificate not found</p>
            <p className="text-xs text-stone-400">
              This certificate doesn&apos;t exist or you don&apos;t have access to it.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const cert = certRaw as unknown as CertData;

  // ── Fetch issuing agent's profile ─────────────────────────────────────────
  const { data: agentRaw } = await supabase
    .from('users')
    .select('full_name, email, location')
    .eq('id', cert.agent_id)
    .single();

  const agent: AgentData = agentRaw ?? {
    full_name: 'Unknown Agent',
    email:    '',
    location: null,
  };

  // ── Helpline lookup: per-dealer override → global default (Vilas rule 4) ──
  let helpline = '';

  // 1. Try dealer-specific override
  const { data: dealerLine } = await supabase
    .from('helpline_settings')
    .select('helpline_number')
    .eq('user_id', cert.agent_id)
    .maybeSingle();

  if (dealerLine?.helpline_number) {
    helpline = dealerLine.helpline_number;
  } else {
    // 2. Fall back to global default
    const { data: defaultLine } = await supabase
      .from('helpline_settings')
      .select('helpline_number')
      .eq('is_default', true)
      .maybeSingle();
    helpline = defaultLine?.helpline_number ?? '—';
  }

  return (
    <CertificatePreview
      cert={cert}
      agent={agent}
      helpline={helpline}
      backHref={backHref}
    />
  );
}
