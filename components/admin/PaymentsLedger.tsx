'use client';

import { useOptimistic, useTransition, useState, useMemo } from 'react';
import {
  IndianRupee, Search, Download, CheckCircle2, Wallet,
} from 'lucide-react';
import { confirmPaymentReceived } from '@/app/admin/certificates/actions';

// ─── types ────────────────────────────────────────────────────────────────────

export type PaymentRow = {
  id: string;
  cert_number: string;
  customer_name: string;
  rsa_amount: number | null;
  total_amount: number | null;
  payment_method: string | null;
  payment_reference: string | null;
  payment_received: boolean;
  status: string;
  created_at: string;
  agent: { full_name: string } | null;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtRupee(n: number | null) {
  if (n == null) return '—';
  return '₹' + n.toLocaleString('en-IN');
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', upi: 'UPI', card: 'Card',
  cheque: 'Cheque', bank_transfer: 'Bank Transfer',
};

const METHOD_COLORS: Record<string, string> = {
  cash:          'bg-emerald-50 text-emerald-700',
  upi:           'bg-blue-50   text-blue-700',
  card:          'bg-violet-50 text-violet-700',
  cheque:        'bg-amber-50  text-amber-700',
  bank_transfer: 'bg-slate-100 text-slate-700',
};

// ─── main component ───────────────────────────────────────────────────────────

type PaymentFilter = 'all' | 'received' | 'pending';

export default function PaymentsLedger({ payments }: { payments: PaymentRow[] }) {
  const [search,        setSearch]        = useState('');
  const [payFilter,     setPayFilter]     = useState<PaymentFilter>('all');
  const [methodFilter,  setMethodFilter]  = useState('all');
  const [dateFrom,      setDateFrom]      = useState('');
  const [dateTo,        setDateTo]        = useState('');
  const [toast,         setToast]         = useState<string | null>(null);
  const [successToast,  setSuccessToast]  = useState<string | null>(null);
  const [isExporting,   setIsExporting]   = useState(false);
  const [pendingId,     setPendingId]     = useState<string | null>(null);

  const [, startTransition] = useTransition();

  // Optimistic update
  const [optimistic, addOptimistic] = useOptimistic(
    payments,
    (cur: PaymentRow[], update: { id: string; payment_received: boolean }) =>
      cur.map(p => p.id === update.id ? { ...p, payment_received: update.payment_received } : p),
  );

  // Unique payment methods for dropdown
  const methods = useMemo(() => {
    const seen = new Set<string>();
    payments.forEach(p => { if (p.payment_method) seen.add(p.payment_method); });
    return Array.from(seen).sort();
  }, [payments]);

  // Filter logic
  const filtered = useMemo(() => {
    return optimistic.filter(p => {
      if (payFilter === 'received' && !p.payment_received) return false;
      if (payFilter === 'pending'  &&  p.payment_received) return false;
      if (methodFilter !== 'all' && p.payment_method !== methodFilter) return false;
      if (dateFrom) {
        const created = new Date(p.created_at);
        created.setHours(0, 0, 0, 0);
        const from = new Date(dateFrom);
        if (created < from) return false;
      }
      if (dateTo) {
        const created = new Date(p.created_at);
        created.setHours(23, 59, 59, 999);
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (created > to) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          p.customer_name.toLowerCase().includes(q) ||
          p.cert_number.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [optimistic, payFilter, methodFilter, dateFrom, dateTo, search]);

  // Summary card values (computed from full list, not filtered)
  const totalCollected = useMemo(
    () => optimistic.filter(p => p.payment_received).reduce((s, p) => s + (p.rsa_amount ?? 0), 0),
    [optimistic],
  );
  const totalPending = useMemo(
    () => optimistic.filter(p => !p.payment_received).reduce((s, p) => s + (p.rsa_amount ?? 0), 0),
    [optimistic],
  );
  const countLogged    = useMemo(() => optimistic.filter(p => p.payment_received).length, [optimistic]);
  const countUnconfirm = useMemo(() => optimistic.filter(p => !p.payment_received).length, [optimistic]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }
  function showSuccess(msg: string) {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  }

  function handleConfirm(id: string) {
    if (pendingId !== null) return;
    setPendingId(id);
    startTransition(async () => {
      addOptimistic({ id, payment_received: true });
      try {
        await confirmPaymentReceived(id, true);
        showSuccess('Payment confirmed');
      } catch (err) {
        showToast(`Could not confirm payment. ${err instanceof Error ? err.message : 'Please try again.'}`);
      } finally {
        setPendingId(null);
      }
    });
  }

  async function handleExport() {
    if (filtered.length === 0) return;
    setIsExporting(true);
    try {
      const { exportToExcel } = await import('@/lib/exportToExcel');
      const rows = filtered.map(p => ({
        'Date':           fmtDate(p.created_at),
        'Cert No':        p.cert_number,
        'Customer':       p.customer_name,
        'Agent':          p.agent?.full_name ?? '—',
        'Method':         METHOD_LABELS[p.payment_method ?? ''] ?? (p.payment_method ?? '—'),
        'Reference':      p.payment_reference ?? '—',
        'RSA Amount (₹)': p.rsa_amount ?? 0,
        'Total Amount (₹)': p.total_amount ?? 0,
        'Status':         p.payment_received ? 'Received' : 'Pending',
      }));
      const today = new Date().toISOString().substring(0, 10);
      exportToExcel(rows, `MVAutoAssist_Payments_${today}`);
      showSuccess(`Exported ${rows.length} row${rows.length !== 1 ? 's' : ''}`);
    } catch (err) {
      showToast(`Export failed: ${err instanceof Error ? err.message : 'Please try again.'}`);
    } finally {
      setIsExporting(false);
    }
  }

  // ─── summary cards ─────────────────────────────────────────────────────────

  const cards = [
    { label: 'Total Collected',       value: fmtRupee(totalCollected), icon: CheckCircle2,  accent: 'bg-emerald-600' },
    { label: 'Total Pending',         value: fmtRupee(totalPending),   icon: Wallet,         accent: 'bg-amber-500'   },
    { label: 'Payment Confirmed',     value: countLogged.toLocaleString('en-IN'),    icon: IndianRupee,   accent: 'bg-slate-900'   },
    { label: 'Payment Unconfirmed',   value: countUnconfirm.toLocaleString('en-IN'), icon: IndianRupee,   accent: 'bg-red-600'     },
  ];

  // ─── render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">

      {/* Page header */}
      <div className="flex items-center justify-between px-6 lg:px-10 py-5 border-b border-stone-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="lg:hidden w-9 shrink-0" />
          <div>
            <h1
              style={{ fontFamily: "'Instrument Serif', serif" }}
              className="text-3xl tracking-tight leading-none"
            >
              Payment Ledger
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              All payment records consolidated from certificates
            </p>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting || filtered.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          {isExporting ? 'Exporting…' : 'Export Excel'}
        </button>
      </div>

      <div className="px-6 lg:px-10 py-8 space-y-8">

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(c => (
            <div
              key={c.label}
              className="bg-white p-5 rounded-2xl border border-stone-200 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-6">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.accent}`}>
                  <c.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div
                style={{ fontFamily: "'Instrument Serif', serif" }}
                className="text-3xl tracking-tight mb-1 break-all"
              >
                {c.value}
              </div>
              <div className="text-xs text-stone-500 uppercase tracking-wider">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

            {/* Search */}
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Customer or cert number…"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-slate-900 transition-colors"
              />
            </div>

            {/* Date range */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-slate-900 transition-colors"
                title="From date"
              />
              <span className="text-stone-400 text-sm shrink-0">–</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-slate-900 transition-colors"
                title="To date"
              />
            </div>

            {/* Payment status */}
            <select
              value={payFilter}
              onChange={e => setPayFilter(e.target.value as PaymentFilter)}
              className="px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:border-slate-900 transition-colors"
            >
              <option value="all">All Statuses</option>
              <option value="received">Received</option>
              <option value="pending">Pending</option>
            </select>

            {/* Payment method */}
            <select
              value={methodFilter}
              onChange={e => setMethodFilter(e.target.value)}
              className="px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:border-slate-900 transition-colors"
            >
              <option value="all">All Methods</option>
              {methods.map(m => (
                <option key={m} value={m}>{METHOD_LABELS[m] ?? m}</option>
              ))}
            </select>

          </div>
        </div>

        {/* Ledger table */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-20 text-center text-stone-400">
              {optimistic.length === 0
                ? 'No payment records found'
                : 'No payments match your filters'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-xs uppercase tracking-wider text-stone-500 whitespace-nowrap">Date</th>
                    <th className="px-6 py-3 text-left font-semibold text-xs uppercase tracking-wider text-stone-500 whitespace-nowrap">Cert No</th>
                    <th className="px-6 py-3 text-left font-semibold text-xs uppercase tracking-wider text-stone-500 whitespace-nowrap">Customer</th>
                    <th className="hidden md:table-cell px-6 py-3 text-left font-semibold text-xs uppercase tracking-wider text-stone-500 whitespace-nowrap">Agent</th>
                    <th className="hidden lg:table-cell px-6 py-3 text-left font-semibold text-xs uppercase tracking-wider text-stone-500 whitespace-nowrap">Method</th>
                    <th className="hidden xl:table-cell px-6 py-3 text-left font-semibold text-xs uppercase tracking-wider text-stone-500 whitespace-nowrap">Reference</th>
                    <th className="px-6 py-3 text-right font-semibold text-xs uppercase tracking-wider text-stone-500 whitespace-nowrap">RSA Amt</th>
                    <th className="hidden lg:table-cell px-6 py-3 text-right font-semibold text-xs uppercase tracking-wider text-stone-500 whitespace-nowrap">Total Amt</th>
                    <th className="px-6 py-3 text-left font-semibold text-xs uppercase tracking-wider text-stone-500 whitespace-nowrap">Status</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filtered.map(p => (
                    <tr key={p.id} className="hover:bg-stone-50 transition-colors">

                      {/* Date */}
                      <td className="px-6 py-4 text-stone-600 whitespace-nowrap">{fmtDate(p.created_at)}</td>

                      {/* Cert No */}
                      <td className="px-6 py-4 font-mono text-xs text-stone-700 whitespace-nowrap">{p.cert_number}</td>

                      {/* Customer */}
                      <td className="px-6 py-4 font-medium text-stone-900 whitespace-nowrap">{p.customer_name}</td>

                      {/* Agent */}
                      <td className="hidden md:table-cell px-6 py-4 text-stone-600 whitespace-nowrap">
                        {p.agent?.full_name ?? '—'}
                      </td>

                      {/* Method badge */}
                      <td className="hidden lg:table-cell px-6 py-4">
                        {p.payment_method ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${METHOD_COLORS[p.payment_method] ?? 'bg-stone-100 text-stone-600'}`}>
                            {METHOD_LABELS[p.payment_method] ?? p.payment_method}
                          </span>
                        ) : (
                          <span className="text-stone-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Reference */}
                      <td className="hidden xl:table-cell px-6 py-4 font-mono text-xs text-stone-500 whitespace-nowrap">
                        {p.payment_reference ?? '—'}
                      </td>

                      {/* RSA Amount */}
                      <td className="px-6 py-4 text-right font-medium text-stone-900 whitespace-nowrap">
                        {fmtRupee(p.rsa_amount)}
                      </td>

                      {/* Total Amount */}
                      <td className="hidden lg:table-cell px-6 py-4 text-right text-stone-600 whitespace-nowrap">
                        {fmtRupee(p.total_amount)}
                      </td>

                      {/* Payment status badge */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          p.payment_received
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${p.payment_received ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          {p.payment_received ? 'Received' : 'Pending'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {!p.payment_received && (
                          <button
                            onClick={() => handleConfirm(p.id)}
                            disabled={pendingId !== null}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {pendingId === p.id ? 'Saving…' : 'Confirm Receipt'}
                          </button>
                        )}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Toasts */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg whitespace-nowrap">
          {toast}
        </div>
      )}
      {successToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg whitespace-nowrap">
          {successToast}
        </div>
      )}

    </div>
  );
}
