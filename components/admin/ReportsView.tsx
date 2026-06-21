'use client';

import { useState, useMemo } from 'react';
import { FileText, IndianRupee, Download } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';

// ─── types ────────────────────────────────────────────────────────────────────

export type ReportCert = {
  id: string;
  cert_number: string;
  customer_name: string;
  make_model: string;
  vehicle_type: string;
  rsa_amount: number | null;
  status: string;
  created_at: string;
  agent: { id: string; full_name: string; location: string | null } | null;
};

export type AgentOption = {
  id: string;
  full_name: string;
  location: string | null;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function toDateStr(iso: string): string {
  return iso.substring(0, 10); // YYYY-MM-DD
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.substring(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}

function fmtRupee(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

function todayStr(): string {
  return new Date().toISOString().substring(0, 10);
}

function thirtyDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().substring(0, 10);
}

// ─── main component ───────────────────────────────────────────────────────────

export default function ReportsView({ certs, agents }: { certs: ReportCert[]; agents: AgentOption[] }) {
  const [dateFrom,       setDateFrom]       = useState(thirtyDaysAgo());
  const [dateTo,         setDateTo]         = useState(todayStr());
  const [selectedAgent,  setSelectedAgent]  = useState('');
  const [exportToast,    setExportToast]    = useState<string | null>(null);

  const dateRangeError = dateFrom && dateTo && dateFrom > dateTo
    ? 'Start date must be on or before end date'
    : null;

  function showExportToast(msg: string) {
    setExportToast(msg);
    setTimeout(() => setExportToast(null), 4000);
  }

  // ── filtered by date range ───────────────────────────────────────────────────
  const datFiltered = useMemo(() => {
    if (dateRangeError) return [];
    return certs.filter(c => {
      const d = toDateStr(c.created_at);
      return d >= dateFrom && d <= dateTo;
    });
  }, [certs, dateFrom, dateTo, dateRangeError]);

  // ── summary totals ───────────────────────────────────────────────────────────
  const totalCerts   = datFiltered.length;
  const totalRevenue = datFiltered.reduce((s, c) => s + (Number(c.rsa_amount) || 0), 0);

  // ── Section 1: group by date + agent ─────────────────────────────────────────
  type S1Row = {
    date: string;
    agentName: string;
    location: string;
    count: number;
    rsaAmount: number;
  };

  const section1Rows = useMemo<S1Row[]>(() => {
    const map = new Map<string, S1Row>();
    datFiltered.forEach(c => {
      const date      = toDateStr(c.created_at);
      const agentId   = c.agent?.id ?? 'unknown';
      const agentName = c.agent?.full_name ?? '—';
      const location  = c.agent?.location ?? '—';
      const key       = `${date}__${agentId}`;
      const existing  = map.get(key);
      if (existing) {
        existing.count++;
        existing.rsaAmount += Number(c.rsa_amount) || 0;
      } else {
        map.set(key, { date, agentName, location, count: 1, rsaAmount: Number(c.rsa_amount) || 0 });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [datFiltered]);

  const s1Total = useMemo(() => ({
    count: section1Rows.reduce((s, r) => s + r.count, 0),
    rsa:   section1Rows.reduce((s, r) => s + r.rsaAmount, 0),
  }), [section1Rows]);

  // ── Section 2: user-wise ──────────────────────────────────────────────────────
  const section2Rows = useMemo(() => {
    if (!selectedAgent) return [];
    return datFiltered.filter(c => c.agent?.id === selectedAgent);
  }, [datFiltered, selectedAgent]);

  const s2Total = useMemo(() => ({
    rsa: section2Rows.reduce((s, c) => s + (Number(c.rsa_amount) || 0), 0),
  }), [section2Rows]);

  // ── export handlers ───────────────────────────────────────────────────────────
  async function exportSection1() {
    try {
      const { exportToExcel } = await import('@/lib/exportToExcel');
      const rows = section1Rows.map(r => ({
        Date:                  fmtDate(r.date),
        'Agent Name':          r.agentName,
        'Location':            r.location,
        'Certificates Issued': r.count,
        'RSA Amount (₹)':      r.rsaAmount,
      }));
      const today = todayStr();
      exportToExcel(rows, `MVAutoAssist_Report_${today}`);
    } catch (err) {
      showExportToast(`Export failed: ${err instanceof Error ? err.message : 'Please try again.'}`);
    }
  }

  async function exportSection2() {
    try {
      const { exportToExcel } = await import('@/lib/exportToExcel');
      const rows = section2Rows.map(c => ({
        Date:               fmtDate(toDateStr(c.created_at)),
        'Customer Name':    c.customer_name,
        'Vehicle':          c.make_model,
        'Certificate No':   c.cert_number,
        'RSA Amount (₹)':   Number(c.rsa_amount) || 0,
        'Status':           c.status,
      }));
      const today = todayStr();
      exportToExcel(rows, `MVAutoAssist_Report_${today}`);
    } catch (err) {
      showExportToast(`Export failed: ${err instanceof Error ? err.message : 'Please try again.'}`);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Top bar */}
      <div className="flex items-center px-6 lg:px-10 py-5 border-b border-stone-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="lg:hidden w-9 shrink-0" />
          <div>
            <h1
              style={{ fontFamily: "'Instrument Serif', serif" }}
              className="text-3xl tracking-tight leading-none"
            >
              Reports
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              Certificate and revenue analytics
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 lg:p-10 space-y-8">

        {/* ── Date range filter ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-slate-900 transition-colors bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className={`px-3 py-2.5 border rounded-lg text-sm focus:outline-none transition-colors bg-white ${
                dateRangeError ? 'border-red-300 focus:border-red-500' : 'border-stone-200 focus:border-slate-900'
              }`}
            />
          </div>
          {dateRangeError && (
            <p className="text-xs text-red-600 font-medium self-end pb-2">{dateRangeError}</p>
          )}
        </div>

        {/* ── Summary cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between mb-6">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-900">
                <FileText className="w-5 h-5 text-white" />
              </div>
            </div>
            <div
              style={{ fontFamily: "'Instrument Serif', serif" }}
              className="text-4xl tracking-tight mb-1"
            >
              {totalCerts.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-stone-500 uppercase tracking-wider">Total Certificates Issued</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between mb-6">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-600">
                <IndianRupee className="w-5 h-5 text-white" />
              </div>
            </div>
            <div
              style={{ fontFamily: "'Instrument Serif', serif" }}
              className="text-4xl tracking-tight mb-1"
            >
              {totalRevenue >= 1000
                ? `₹${(totalRevenue / 1000).toFixed(1)}k`
                : fmtRupee(totalRevenue)}
            </div>
            <div className="text-xs text-stone-500 uppercase tracking-wider">Total RSA Revenue</div>
          </div>
        </div>

        {/* ── Section 1: Certificate Reports ───────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Certificate Reports</h2>
            <button
              onClick={exportSection1}
              disabled={section1Rows.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            {section1Rows.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="w-8 h-8 text-stone-200 mx-auto mb-2" />
                <p className="text-sm text-stone-400">No certificates in this date range</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr className="text-left text-xs uppercase tracking-wider text-stone-500">
                      <th className="px-6 py-3 font-semibold">Date</th>
                      <th className="px-6 py-3 font-semibold">Agent Name</th>
                      <th className="px-6 py-3 font-semibold hidden md:table-cell">Location</th>
                      <th className="px-6 py-3 font-semibold">Certificates</th>
                      <th className="px-6 py-3 font-semibold">RSA Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {section1Rows.map((r, i) => (
                      <tr key={i} className="hover:bg-stone-50 transition-colors">
                        <td className="px-6 py-4 text-xs text-stone-500">{fmtDate(r.date)}</td>
                        <td className="px-6 py-4 font-semibold">{r.agentName}</td>
                        <td className="px-6 py-4 hidden md:table-cell text-stone-600 text-xs">{r.location}</td>
                        <td className="px-6 py-4 font-semibold">{r.count}</td>
                        <td className="px-6 py-4 font-semibold">{fmtRupee(r.rsaAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-stone-50 border-t-2 border-stone-200">
                    <tr>
                      <td className="px-6 py-3 text-xs font-bold text-stone-700 uppercase tracking-wider" colSpan={3}>
                        Total
                      </td>
                      <td className="px-6 py-3 font-bold">{s1Total.count}</td>
                      <td className="px-6 py-3 font-bold">{fmtRupee(s1Total.rsa)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Section 2: User-wise Reports ─────────────────────────────────── */}
        <div>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
            <div>
              <h2 className="font-semibold text-lg mb-1">User-wise Reports</h2>
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-stone-600">Agent</label>
                <select
                  value={selectedAgent}
                  onChange={e => setSelectedAgent(e.target.value)}
                  className="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-slate-900 transition-colors bg-white"
                >
                  <option value="">Select an agent…</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.full_name}</option>
                  ))}
                </select>
              </div>
            </div>
            {selectedAgent && (
              <button
                onClick={exportSection2}
                disabled={section2Rows.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Export Excel
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            {!selectedAgent ? (
              <div className="py-12 text-center">
                <p className="text-sm text-stone-400">Select an agent to view their report</p>
              </div>
            ) : section2Rows.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="w-8 h-8 text-stone-200 mx-auto mb-2" />
                <p className="text-sm text-stone-400">No certificates for this agent in the selected range</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr className="text-left text-xs uppercase tracking-wider text-stone-500">
                      <th className="px-6 py-3 font-semibold">Date</th>
                      <th className="px-6 py-3 font-semibold">Customer Name</th>
                      <th className="px-6 py-3 font-semibold hidden md:table-cell">Vehicle</th>
                      <th className="px-6 py-3 font-semibold hidden lg:table-cell">Certificate No</th>
                      <th className="px-6 py-3 font-semibold">RSA Amount</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {section2Rows.map(c => (
                      <tr key={c.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-6 py-4 text-xs text-stone-500">{fmtDate(toDateStr(c.created_at))}</td>
                        <td className="px-6 py-4 font-semibold">{c.customer_name}</td>
                        <td className="px-6 py-4 hidden md:table-cell text-xs text-stone-600">{c.make_model}</td>
                        <td className="px-6 py-4 hidden lg:table-cell">
                          <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-xs font-semibold text-slate-800">
                            {c.cert_number}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold">{fmtRupee(Number(c.rsa_amount) || 0)}</td>
                        <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-stone-50 border-t-2 border-stone-200">
                    <tr>
                      <td className="px-6 py-3 text-xs font-bold text-stone-700 uppercase tracking-wider" colSpan={4}>
                        Total
                      </td>
                      <td className="px-6 py-3 font-bold">{fmtRupee(s2Total.rsa)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

      {exportToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg whitespace-nowrap">
          {exportToast}
        </div>
      )}
    </>
  );
}
