import Link from 'next/link';
import {
  FileText, CheckCircle2, Clock, IndianRupee,
  TrendingUp, Car, Bike, ArrowUpRight, ChevronRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import StatusBadge from '@/components/StatusBadge';

// ─── types ────────────────────────────────────────────────────────────────────

type RecentCert = {
  id: string;
  cert_number: string;
  customer_name: string;
  make_model: string;
  vehicle_type: string;
  total_amount: number;
  status: string;
  created_at: string;
  agent: { full_name: string } | null;
};

type DealerUser = {
  id: string;
  full_name: string;
  location: string | null;
};

type RankedDealer = DealerUser & { cert_count: number };

type ChartBar = { label: string; amount: number; height: number };

// ─── small helpers ────────────────────────────────────────────────────────────

function fmtRupee(amount: number): string {
  return amount >= 1000 ? `₹${(amount / 1000).toFixed(1)}k` : `₹${amount}`;
}

// Converts an ISO date string YYYY-MM-DD to "11 May" style label (UTC).
function dayLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d))
    .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // ── time boundaries (UTC throughout to match Supabase timestamps) ──────────
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const chartStartISO = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 11)
  ).toISOString();

  // ── parallel fetch — all 8 queries in one round-trip ──────────────────────
  let total = 0, approved = 0, pending = 0, revenue = 0;
  let recent: RecentCert[] = [];
  let rankedDealers: RankedDealer[] = [];
  let bars: ChartBar[] = buildEmptyBars(now);

  try {
    const [
      r_total,
      r_approved,
      r_pending,
      r_mtd,
      r_recent,
      r_agentIds,
      r_chart,
      r_dealers,
    ] = await Promise.all([
      supabase
        .from('certificates')
        .select('*', { count: 'exact', head: true }),

      supabase
        .from('certificates')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved'),

      supabase
        .from('certificates')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),

      // MTD revenue: approved certs created in the current calendar month
      supabase
        .from('certificates')
        .select('total_amount')
        .eq('status', 'approved')
        .gte('created_at', monthStart),

      // Last 5 certs with the issuing agent's name via FK join
      supabase
        .from('certificates')
        .select(
          'id, cert_number, customer_name, make_model, vehicle_type, total_amount, status, created_at, agent:users!certificates_agent_id_fkey(full_name)'
        )
        .order('created_at', { ascending: false })
        .limit(5),

      // All agent_ids for dealer leaderboard calculation
      supabase
        .from('certificates')
        .select('agent_id'),

      // Cert revenue per day over last 12 days (for bar chart)
      supabase
        .from('certificates')
        .select('created_at, total_amount')
        .gte('created_at', chartStartISO)
        .order('created_at', { ascending: true }),

      // All dealer profiles (for name lookup in leaderboard)
      supabase
        .from('users')
        .select('id, full_name, location')
        .eq('role', 'dealer'),
    ]);

    // log any Supabase-level errors without crashing
    const errs = [r_total, r_approved, r_pending, r_mtd, r_recent, r_agentIds, r_chart, r_dealers];
    errs.forEach((r, i) => {
      if (r.error) console.error(`[dashboard query ${i + 1}]`, r.error);
    });

    // ── stat values ──────────────────────────────────────────────────────────
    total    = r_total.count    ?? 0;
    approved = r_approved.count ?? 0;
    pending  = r_pending.count  ?? 0;
    revenue  = (r_mtd.data ?? []).reduce((s, c) => s + (Number(c.total_amount) || 0), 0);

    // ── recent certs ─────────────────────────────────────────────────────────
    // PostgREST without generated types infers the FK join as array[];
    // at runtime it is the correct {full_name: string}|null object.
    recent = (r_recent.data ?? []) as unknown as RecentCert[];

    // ── dealer leaderboard ───────────────────────────────────────────────────
    // Count certs per agent in JS, then join with dealer profiles.
    const agentCount = new Map<string, number>();
    (r_agentIds.data ?? []).forEach(row => {
      if (row.agent_id) agentCount.set(row.agent_id, (agentCount.get(row.agent_id) ?? 0) + 1);
    });
    rankedDealers = ((r_dealers.data ?? []) as DealerUser[])
      .map(d => ({ ...d, cert_count: agentCount.get(d.id) ?? 0 }))
      .filter(d => d.cert_count > 0)
      .sort((a, b) => b.cert_count - a.cert_count)
      .slice(0, 3);

    // ── chart bars ───────────────────────────────────────────────────────────
    const dayMap = new Map<string, number>();
    (r_chart.data ?? []).forEach(c => {
      const day = c.created_at.substring(0, 10); // YYYY-MM-DD (UTC)
      dayMap.set(day, (dayMap.get(day) ?? 0) + (Number(c.total_amount) || 0));
    });
    const maxAmt = Math.max(...Array.from(dayMap.values()), 1);
    bars = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (11 - i)));
      const key = d.toISOString().substring(0, 10);
      const amount = dayMap.get(key) ?? 0;
      return { label: dayLabel(key), amount, height: Math.round((amount / maxAmt) * 100) };
    });

  } catch (err) {
    console.error('[dashboard] unexpected error', err);
    // all values stay at their defaults — page still renders with empty states
  }

  // ── stat card config ───────────────────────────────────────────────────────
  const stats = [
    { label: 'Total Certificates', value: total.toLocaleString('en-IN'),    icon: FileText,    accent: 'bg-slate-900'    },
    { label: 'Approved',           value: approved.toLocaleString('en-IN'), icon: CheckCircle2, accent: 'bg-emerald-600' },
    { label: 'Pending Review',     value: pending.toLocaleString('en-IN'),  icon: Clock,        accent: 'bg-amber-500'   },
    { label: 'Revenue (MTD)',      value: fmtRupee(revenue),                icon: IndianRupee,  accent: 'bg-red-600'     },
  ];

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 lg:px-10 py-5 border-b border-stone-200 bg-white">
        <div className="flex items-center gap-3">
          {/* Spacer so the title clears the mobile hamburger button */}
          <div className="lg:hidden w-9 shrink-0" />
          <div>
            <h1
              style={{ fontFamily: "'Instrument Serif', serif" }}
              className="text-3xl tracking-tight leading-none"
            >
              Dashboard
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              Overview of certificate operations across your network
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-stone-500 px-3 py-2 bg-stone-100 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live · synced now
        </div>
      </div>

      <div className="p-6 lg:p-10 space-y-8">

        {/* ── stat cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div
              key={i}
              className="bg-white p-5 rounded-2xl border border-stone-200 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-6">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.accent}`}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                {/* Trend badge — omitted until we have historical data */}
                <span className="text-xs font-semibold text-stone-400">{'—'}</span>
              </div>
              <div
                style={{ fontFamily: "'Instrument Serif', serif" }}
                className="text-4xl tracking-tight mb-1"
              >
                {s.value}
              </div>
              <div className="text-xs text-stone-500 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── 2-column layout ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent certificates (2/3 width) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
              <div>
                <h3 className="font-semibold">Recent Certificates</h3>
                <p className="text-xs text-stone-500">
                  Last {recent.length} issuance{recent.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Link
                href="/admin/certificates"
                className="text-xs font-semibold text-slate-900 hover:underline flex items-center gap-1"
              >
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <FileText className="w-10 h-10 text-stone-200 mb-3" />
                <p className="text-sm font-semibold text-stone-400">No certificates yet</p>
                <p className="text-xs text-stone-400 mt-1">
                  Certificates issued by dealers will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {/* TODO (Phase 6): /cert/[id] placeholder page lands on "coming soon". Real preview built in Week 4. */}
                {recent.map(c => (
                  <Link
                    key={c.id}
                    href={`/cert/${c.id}`}
                    prefetch={false}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-stone-50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                      {c.vehicle_type === 'Two Wheeler'
                        ? <Bike className="w-4 h-4 text-stone-600" />
                        : <Car className="w-4 h-4 text-stone-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{c.customer_name}</div>
                      <div className="text-xs text-stone-500 truncate">
                        {c.make_model}
                        {c.agent?.full_name && (
                          <> · <span className="text-stone-400">{c.agent.full_name}</span></>
                        )}
                      </div>
                    </div>
                    <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                      <span className="font-semibold text-sm">
                        ₹{(c.total_amount ?? 0).toLocaleString('en-IN')}
                      </span>
                      <StatusBadge status={c.status} />
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-300 shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right column (1/3 width) */}
          <div className="space-y-6">

            {/* Dark revenue card with bar chart */}
            <div
              className="rounded-2xl p-6 text-white relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1a2744 100%)' }}
            >
              {/* Decorative amber glow */}
              <div
                className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20 blur-2xl pointer-events-none"
                style={{ background: '#f59e0b' }}
              />
              <div className="relative">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-4">
                  <TrendingUp className="w-3 h-3" /> This month
                </div>
                <div
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                  className="text-5xl tracking-tight mb-1"
                >
                  {fmtRupee(revenue)}
                </div>
                <p className="text-stone-300 text-sm mb-6">
                  Gross revenue from certificate issuance
                </p>

                {/* 12-day bar chart — last bar (today) highlighted amber */}
                <div className="h-16 flex items-end gap-0.5">
                  {bars.map((bar, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm transition-all"
                      style={{
                        // Fixed 10px floor for zero-data bars so chart structure stays visible.
                        // Percentage heights only apply when there is actual revenue.
                        height: bar.amount > 0 ? `${bar.height}%` : '10px',
                        background: i === 11 ? '#f59e0b' : 'rgba(255,255,255,0.2)',
                      }}
                      title={`${bar.label}: ₹${bar.amount.toLocaleString('en-IN')}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Top dealers leaderboard */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5">
              <h3 className="font-semibold mb-4 text-sm">Top Dealers</h3>
              {rankedDealers.length === 0 ? (
                <div className="text-xs text-stone-400 text-center py-6">
                  No certificate activity yet
                </div>
              ) : (
                <div className="space-y-3">
                  {rankedDealers.map((d, i) => (
                    <div key={d.id} className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                          i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-stone-400' : 'bg-amber-700'
                        }`}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{d.full_name}</div>
                        <div className="text-xs text-stone-500">{d.location ?? 'No location set'}</div>
                      </div>
                      <div className="text-sm font-semibold shrink-0">{d.cert_count}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

// ─── helper: empty bar array for error/fallback state ─────────────────────────

function buildEmptyBars(now: Date): ChartBar[] {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (11 - i)));
    const key = d.toISOString().substring(0, 10);
    return { label: dayLabel(key), amount: 0, height: 0 };
  });
}
