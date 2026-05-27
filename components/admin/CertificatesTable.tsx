'use client';

import { useOptimistic, useTransition, useState } from 'react';
import Link from 'next/link';
import { Search, Download, CheckCircle2, X, ChevronRight, FileText, Banknote } from 'lucide-react';
import { approveCertificate, rejectCertificate, confirmPaymentReceived } from '@/app/admin/certificates/actions';
import StatusBadge from '@/components/StatusBadge';

// ─── shared type (exported so page.tsx can use it) ───────────────────────────

export type CertRow = {
  id: string;
  cert_number: string;
  customer_name: string;
  customer_mobile: string;
  make_model: string;
  vehicle_type: string;
  total_amount: number;
  status: string;
  created_at: string;
  chassis_no: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  payment_received: boolean;
  agent: { full_name: string } | null;
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash', upi: 'UPI', card: 'Card', cheque: 'Cheque', bank_transfer: 'Bank Transfer',
};

// ─── main component ───────────────────────────────────────────────────────────

type Filter = 'all' | 'pending' | 'approved' | 'rejected';
const FILTERS: Filter[] = ['all', 'pending', 'approved', 'rejected'];

export default function CertificatesTable({ certs }: { certs: CertRow[] }) {
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState<Filter>('all');
  const [toast,  setToast]    = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [paymentPendingId, setPaymentPendingId] = useState<string | null>(null);

  const [, startTransition] = useTransition();

  // Optimistic state — handles status + payment_received changes
  type OptUpdate = { id: string } & Partial<Pick<CertRow, 'status' | 'payment_received'>>;
  const [optimisticCerts, addOptimistic] = useOptimistic(
    certs,
    (current: CertRow[], update: OptUpdate) =>
      current.map(c => c.id === update.id ? { ...c, ...update } : c)
  );

  // ── filter logic ────────────────────────────────────────────────────────────
  const filtered = optimisticCerts.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.customer_name.toLowerCase().includes(q) ||
        c.cert_number.toLowerCase().includes(q)   ||
        (c.chassis_no ?? '').toLowerCase().includes(q) ||
        c.customer_mobile.includes(q)
      );
    }
    return true;
  });

  // ── payment received toggle ──────────────────────────────────────────────────
  function handlePaymentReceived(certId: string, received: boolean) {
    if (paymentPendingId !== null || pendingId !== null) return;
    setPaymentPendingId(certId);
    startTransition(async () => {
      addOptimistic({ id: certId, payment_received: received });
      try {
        await confirmPaymentReceived(certId, received);
      } catch (err) {
        showToast(`Could not update payment status. ${err instanceof Error ? err.message : 'Please try again.'}`);
      } finally {
        setPaymentPendingId(null);
      }
    });
  }

  // ── approve / reject ────────────────────────────────────────────────────────
  function handleStatus(certId: string, newStatus: 'approved' | 'rejected') {
    setPendingId(certId);
    startTransition(async () => {
      addOptimistic({ id: certId, status: newStatus });
      try {
        if (newStatus === 'approved') await approveCertificate(certId);
        else                          await rejectCertificate(certId);
      } catch (err) {
        const detail = err instanceof Error ? err.message : 'Please try again.';
        showToast(`Could not ${newStatus} certificate. ${detail}`);
      } finally {
        setPendingId(null);
      }
    });
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  async function handleExport() {
    const { exportToExcel } = await import('@/lib/exportToExcel');
    const rows = filtered.map(c => ({
      'Certificate No':  c.cert_number,
      'Date':            new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      'Customer Name':   c.customer_name,
      'Mobile':          c.customer_mobile,
      'Vehicle':         c.make_model,
      'Type':            c.vehicle_type,
      'Agent':           c.agent?.full_name ?? '—',
      'Amount (₹)':      c.total_amount ?? 0,
      'Payment Method':  c.payment_method ?? '—',
      'Payment Ref':     c.payment_reference ?? '—',
      'Payment Received': c.payment_received ? 'Yes' : 'No',
      'Status':          c.status,
    }));
    const today = new Date().toISOString().substring(0, 10);
    exportToExcel(rows, `MVAutoAssist_Certificates_${today}`);
  }

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 lg:px-10 py-5 border-b border-stone-200 bg-white">
        <div className="flex items-center gap-3">
          {/* Spacer so title clears mobile hamburger button */}
          <div className="lg:hidden w-9 shrink-0" />
          <div>
            <h1
              style={{ fontFamily: "'Instrument Serif', serif" }}
              className="text-3xl tracking-tight leading-none"
            >
              Certificates
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              {filtered.length} of {certs.length} record{certs.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      <div className="p-6 lg:p-10">
        {/* Search + filter row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, cert no., chassis no., mobile…"
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-slate-900 text-sm transition-colors"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium capitalize transition-all ${
                  filter === f
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-10 h-10 text-stone-200 mb-3" />
              <p className="text-sm font-semibold text-stone-400">No certificates found</p>
              {(search || filter !== 'all') && (
                <p className="text-xs text-stone-400 mt-1">Try adjusting your search or filter.</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr className="text-left text-xs uppercase tracking-wider text-stone-500">
                    <th className="px-6 py-3 font-semibold">Certificate</th>
                    <th className="px-6 py-3 font-semibold">Customer</th>
                    <th className="px-6 py-3 font-semibold hidden md:table-cell">Vehicle</th>
                    <th className="px-6 py-3 font-semibold hidden lg:table-cell">Agent</th>
                    <th className="px-6 py-3 font-semibold">Amount</th>
                    <th className="px-6 py-3 font-semibold hidden xl:table-cell">Payment</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filtered.map(c => (
                    <tr
                      key={c.id}
                      className={`hover:bg-stone-50 transition-colors ${pendingId === c.id ? 'opacity-60' : ''}`}
                    >
                      {/* Certificate number + date */}
                      <td className="px-6 py-4">
                        <div
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          className="text-xs font-semibold text-slate-800"
                        >
                          {c.cert_number}
                        </div>
                        <div className="text-xs text-stone-400 mt-0.5">
                          {new Date(c.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-6 py-4">
                        <div className="font-semibold">{c.customer_name}</div>
                        <div className="text-xs text-stone-500">{c.customer_mobile}</div>
                      </td>

                      {/* Vehicle — hidden on small screens */}
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div className="font-medium text-xs">{c.make_model}</div>
                        <div className="text-xs text-stone-500">{c.vehicle_type}</div>
                      </td>

                      {/* Agent — hidden on medium screens */}
                      <td className="px-6 py-4 hidden lg:table-cell text-xs text-stone-600">
                        {c.agent?.full_name ?? '—'}
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4 font-semibold">
                        ₹{(c.total_amount ?? 0).toLocaleString('en-IN')}
                      </td>

                      {/* Payment method + reference — hidden on small screens */}
                      <td className="px-6 py-4 hidden xl:table-cell">
                        {c.payment_method ? (
                          <div>
                            <div className="text-xs font-semibold text-stone-700">
                              {PAYMENT_LABELS[c.payment_method] ?? c.payment_method}
                            </div>
                            {c.payment_reference && (
                              <div className="text-xs text-stone-400 mt-0.5">{c.payment_reference}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-stone-300">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <StatusBadge status={c.status} />
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 justify-end">
                          {/* Payment received toggle — independent of approve/reject */}
                          {c.payment_method && (
                            <button
                              onClick={() => handlePaymentReceived(c.id, !c.payment_received)}
                              disabled={paymentPendingId !== null || pendingId !== null}
                              title={c.payment_received ? 'Unmark payment received' : 'Mark payment received'}
                              className={`p-1.5 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                paymentPendingId === c.id ? 'opacity-40 cursor-wait' : ''
                              } ${
                                c.payment_received
                                  ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                                  : 'text-stone-300 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              <Banknote className="w-4 h-4" />
                            </button>
                          )}
                          {c.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleStatus(c.id, 'approved')}
                                disabled={pendingId !== null}
                                className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                title="Approve"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleStatus(c.id, 'rejected')}
                                disabled={pendingId !== null}
                                className="p-1.5 rounded hover:bg-red-50 text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                title="Reject"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <Link
                            href={`/cert/${c.id}`}
                            prefetch={false}
                            className="p-1.5 rounded hover:bg-stone-100 transition-colors"
                            title="View certificate"
                          >
                            <ChevronRight className="w-4 h-4 text-stone-400" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Error toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg whitespace-nowrap">
          {toast}
        </div>
      )}
    </>
  );
}
