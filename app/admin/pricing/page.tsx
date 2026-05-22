import type { Metadata } from 'next';
import { AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import PricingAssignments, { type DealerWithPrices } from '@/components/admin/PricingAssignments';

export const metadata: Metadata = {
  title: 'Pricing · MVAutoAssist Admin',
};

// Company-wide catalog of allowed RSA price points.
// These are fixed business constants — not derived from the DB.
// Per-dealer assignments are stored in price_tiers; this list drives the toggle UI.
// TODO (Phase 6): Add a "+ Custom price" input per dealer row for off-catalog amounts.
const DEFAULT_TIERS = [1200, 1500, 1800, 2200, 2500];

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
      .select('user_id, amount, is_default')
      .order('amount', { ascending: true }),
  ]);

  if (e1) console.error('[PricingPage] dealers:', e1);
  if (e2) console.error('[PricingPage] tiers:', e2);

  // Per-dealer amounts + default map
  const tiersByUser = new Map<string, { amounts: number[]; defaultAmount: number | null }>();
  (tierRows ?? []).forEach(t => {
    const amt = Number(t.amount);
    const existing = tiersByUser.get(t.user_id);
    if (existing) {
      existing.amounts.push(amt);
      if (t.is_default) existing.defaultAmount = amt;
    } else {
      tiersByUser.set(t.user_id, {
        amounts: [amt],
        defaultAmount: t.is_default ? amt : null,
      });
    }
  });

  const dealers: DealerWithPrices[] = (rawDealers ?? []).map(d => {
    const tiers = tiersByUser.get(d.id);
    return {
      id: d.id,
      full_name: d.full_name,
      location: d.location,
      amounts: tiers?.amounts ?? [],
      defaultAmount: tiers?.defaultAmount ?? null,
    };
  });

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
              {DEFAULT_TIERS.map(p => (
                <div
                  key={p}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-semibold"
                >
                  ₹{p.toLocaleString('en-IN')}
                </div>
              ))}
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
        {/* PricingAssignments always shows the full DEFAULT_TIERS catalog for every dealer */}
        <PricingAssignments dealers={dealers} allPrices={DEFAULT_TIERS} />

      </div>
    </>
  );
}
