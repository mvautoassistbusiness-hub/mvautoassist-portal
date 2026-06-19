'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Car, Bike, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';

export type CertCard = {
  id: string;
  cert_number: string;
  customer_name: string;
  make_model: string;
  vehicle_type: string;
  rsa_amount: number;
  total_amount: number;
  status: string;
  end_date: string | null;
  payment_received: boolean;
  agent_id: string;
  agent: { full_name: string } | { full_name: string }[] | null;
};

type Filter = 'all' | 'pending' | 'approved' | 'payment_pending';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all',             label: 'All' },
  { value: 'pending',         label: 'Pending Approval' },
  { value: 'approved',        label: 'Approved' },
  { value: 'payment_pending', label: 'Payment Pending' },
];

const PAGE_SIZE = 10;

export default function CertificatesGrid({ certs, myUserId }: { certs: CertCard[]; myUserId: string }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [page,   setPage]   = useState(0);

  const filtered = certs.filter(c => {
    if (filter === 'pending'         && c.status !== 'pending') return false;
    if (filter === 'approved'        && c.status !== 'approved') return false;
    if (filter === 'payment_pending' && !(c.status === 'approved' && !c.payment_received)) return false;

    if (search) {
      const q = search.toLowerCase();
      return (
        c.customer_name.toLowerCase().includes(q) ||
        c.cert_number.toLowerCase().includes(q)   ||
        c.make_model.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage   = Math.min(page, Math.max(0, totalPages - 1));
  const paginated  = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  function handleFilterChange(f: Filter) {
    setFilter(f);
    setPage(0);
  }

  function handleSearchChange(s: string) {
    setSearch(s);
    setPage(0);
  }

  return (
    <div className="p-6 lg:p-10">
      {/* Search + filter chips */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search by name, cert no., vehicle…"
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-slate-900 text-sm transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => handleFilterChange(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f.value
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-16 text-center">
          <FileText className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="font-semibold mb-1">No certificates found</h3>
          {(search || filter !== 'all') && (
            <p className="text-sm text-stone-500">Try adjusting your search or filter.</p>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            {paginated.map(c => (
              <Link
                key={c.id}
                href={`/cert/${c.id}`}
                className="block bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                    {c.vehicle_type === 'Two Wheeler'
                      ? <Bike className="w-5 h-5 text-stone-600" />
                      : <Car  className="w-5 h-5 text-stone-600" />}
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
                <div className="text-xs text-stone-500 mb-2">{c.make_model}</div>
                {c.agent_id !== myUserId && c.agent && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 mb-2 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] text-indigo-600 font-medium">
                    by {Array.isArray(c.agent) ? c.agent[0].full_name : c.agent.full_name}
                  </div>
                )}

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
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-stone-500">
                {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="p-2 rounded-lg border border-stone-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50 transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="flex items-center px-3 text-sm text-stone-500">
                  {safePage + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                  className="p-2 rounded-lg border border-stone-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50 transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
