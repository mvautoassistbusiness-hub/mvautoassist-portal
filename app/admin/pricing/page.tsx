import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import PricingAssignments, { type DealerWithPrices } from '@/components/admin/PricingAssignments';

export const metadata: Metadata = {
  title: 'Pricing · MVAutoAssist Admin',
};

export default async function PricingPage() {
  const supabase = await createClient();

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
      .select('id, user_id, amount, is_default')
      .order('amount', { ascending: true }),
  ]);

  if (e1) console.error('[PricingPage] dealers:', e1);
  if (e2) console.error('[PricingPage] tiers:', e2);

  // Group tiers by dealer
  const tiersByUser = new Map<string, { id: string; amount: number; is_default: boolean }[]>();
  (tierRows ?? []).forEach(t => {
    const entry = tiersByUser.get(t.user_id) ?? [];
    entry.push({ id: t.id, amount: Number(t.amount), is_default: Boolean(t.is_default) });
    tiersByUser.set(t.user_id, entry);
  });

  const dealers: DealerWithPrices[] = (rawDealers ?? []).map(d => ({
    id:        d.id,
    full_name: d.full_name,
    location:  d.location,
    tiers:     tiersByUser.get(d.id) ?? [],
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
              Assign RSA price tiers to each dealer (₹500–₹5,000)
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 lg:p-10">
        <PricingAssignments dealers={dealers} />
      </div>
    </>
  );
}
