import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, FileText, Car, Bike } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import StatusBadge from '@/components/StatusBadge';

export const metadata: Metadata = {
  title: 'My Certificates · MVAutoAssist',
};

type CertCard = {
  id: string;
  cert_number: string;
  customer_name: string;
  make_model: string;
  vehicle_type: string;
  total_amount: number;
  status: string;
  end_date: string;
};

export default async function AgentCertificatesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // RLS enforces agent_id = auth.uid() so no manual filter needed
  const { data, error } = await supabase
    .from('certificates')
    .select('id, cert_number, customer_name, make_model, vehicle_type, total_amount, status, end_date')
    .order('created_at', { ascending: false });

  if (error) console.error('[AgentCertificates]', error);

  const certs = (data ?? []) as CertCard[];

  // Totals for subtitle
  const totalRevenue = certs
    .filter(c => c.status === 'approved')
    .reduce((s, c) => s + (c.total_amount ?? 0), 0);

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
              {certs.length} issued
              {totalRevenue > 0 && (
                <> · ₹{totalRevenue.toLocaleString('en-IN')} approved revenue</>
              )}
            </p>
          </div>
        </div>
        <Link
          href="/agent/create"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)' }}
        >
          <Plus className="w-4 h-4" />
          New certificate
        </Link>
      </div>

      <div className="p-6 lg:p-10">
        {certs.length === 0 ? (
          /* Empty state */
          <div className="bg-white rounded-2xl border border-stone-200 p-16 text-center">
            <FileText className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">No certificates yet</h3>
            <p className="text-sm text-stone-500 mb-5">
              Create your first RSA certificate to get started.
            </p>
            <Link
              href="/agent/create"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create certificate
            </Link>
          </div>
        ) : (
          /* Card grid — matches demo layout */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {certs.map(c => (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-default"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                    {c.vehicle_type === 'Two Wheeler'
                      ? <Bike className="w-5 h-5 text-stone-600" />
                      : <Car className="w-5 h-5 text-stone-600" />}
                  </div>
                  <StatusBadge status={c.status} />
                </div>

                <div
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  className="text-[10px] text-stone-400 mb-1"
                >
                  {c.cert_number}
                </div>
                <div className="font-semibold mb-0.5">{c.customer_name}</div>
                <div className="text-xs text-stone-500 mb-4">{c.make_model}</div>

                <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                  <div className="text-xs text-stone-500">
                    Valid till{' '}
                    {c.end_date
                      ? new Date(c.end_date).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })
                      : '—'}
                  </div>
                  <div className="font-bold">
                    ₹{(c.total_amount ?? 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
