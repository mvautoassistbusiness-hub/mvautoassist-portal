import type { Metadata } from 'next';
import { AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import PricingAssignments, { type DealerWithPrices } from '@/components/admin/PricingAssignments';

export const metadata: Metadata = {
  title: 'Pricing · MVAutoAssist Admin',
};

// TODO (Week 3 cleanup): Add "+ New price tier" input for admin to define new amounts.
// Currently the page only toggles EXISTING tiers — if all tiers are deleted,
// there's no UI to add new ones back. Backup workaround: insert directly via Supabase SQL.

export default async function PricingPage() {
  const supabase = await createClient();

  // Two parallel queries — joined in JS
  const [
    { data: rawDealers, error: e1 },
    { data: tierRows,   error: e2 },
  ] = await Promise.all([
    supabase
      .from('users')
      .select('id, full_name, location')
      .eq('role', 'dealer')
      .order('full_name', { ascending: true }),

    supabase
      .from('price_tiers')
      .select('user_id, amount')
      .order('amount', { ascending: true }),
  ]);

  if (e1) console.error('[PricingPage] dealers:', e1);
  if (e2) console.error('[PricingPage] tiers:', e2);

  // All distinct amounts across all tiers — the global price universe shown as pills
  // and used as the toggle options for each dealer row.
  const allPrices = [...new Set((tierRows ?? []).map(t => Number(t.amount)))]
    .sort((a, b) => a - b);

  // Per-dealer amounts map
  const tiersByUser = new Map<string, number[]>();
  (tierRows ?? []).forEach(t => {
    const amt = Number(t.amount);
    const existing = tiersByUser.get(t.user_id);
    if (existing) existing.push(amt);
    else tiersByUser.set(t.user_id, [amt]);
  });

  const dealers: DealerWithPrices[] = (rawDealers ?? []).map(d => ({
    id: d.id,
    full_name: d.full_name,
    location: d.location,
    amounts: tiersByUser.get(d.id) ?? [],
  }));

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
              Pricing Rules
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              Control which certificate prices each dealer can select
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 lg:p-10 space-y-6">

        {/* Default Price Tiers card — static, server-rendered */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <div>
              <h3 className="font-semibold mb-1">Default Price Tiers</h3>
              <p className="text-sm text-stone-500">Available price points across the platform</p>
            </div>
            <div className="sm:ml-auto flex gap-2 flex-wrap">
              {allPrices.length > 0 ? (
                allPrices.map(p => (
                  <div
                    key={p}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-semibold"
                  >
                    ₹{p.toLocaleString('en-IN')}
                  </div>
                ))
              ) : (
                <span className="text-sm text-stone-400">No price tiers configured yet</span>
              )}
            </div>
          </div>

          {/* Amber info banner */}
          <div className="text-xs text-stone-600 p-3 rounded-lg bg-amber-50 border border-amber-100 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Dealers can only select from prices assigned to them. They cannot enter custom amounts.
            </span>
          </div>
        </div>

        {/* Per-user assignments — client component owns toggle interactivity */}
        <PricingAssignments dealers={dealers} allPrices={allPrices} />

      </div>
    </>
  );
}
