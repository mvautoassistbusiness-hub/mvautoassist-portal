'use client';

import { useOptimistic, useTransition, useState } from 'react';
import { Star } from 'lucide-react';
import {
  addPriceTier,
  removePriceTier,
  setDefaultPriceTier,
  unsetDefaultPriceTier,
} from '@/app/admin/pricing/actions';

// ─── types ────────────────────────────────────────────────────────────────────

export type DealerWithPrices = {
  id: string;
  full_name: string;
  location: string | null;
  amounts: number[];
  defaultAmount: number | null;
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

// ─── component ───────────────────────────────────────────────────────────────

export default function PricingAssignments({
  dealers,
  allPrices,
}: {
  dealers: DealerWithPrices[];
  allPrices: number[];
}) {
  const [, startTransition] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [defaultPending, setDefaultPending] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // useOptimistic updates the dealer list immediately when a pill is toggled;
  // auto-reverts if the server action throws.
  const [optimisticDealers, addOptimistic] = useOptimistic(
    dealers,
    (
      current: DealerWithPrices[],
      { userId, amount, add }: { userId: string; amount: number; add: boolean }
    ) =>
      current.map(d => {
        if (d.id !== userId) return d;
        const next = add
          ? [...d.amounts, amount].sort((a, b) => a - b)
          : d.amounts.filter(a => a !== amount);
        return { ...d, amounts: next };
      })
  );

  function toggle(userId: string, amount: number) {
    if (pendingKey !== null) return; // one mutation at a time

    const dealer = optimisticDealers.find(d => d.id === userId);
    const add = !(dealer?.amounts.includes(amount) ?? false);
    const key = `${userId}:${amount}`;

    setPendingKey(key);
    startTransition(async () => {
      addOptimistic({ userId, amount, add });
      try {
        if (add) await addPriceTier(userId, amount);
        else     await removePriceTier(userId, amount);
      } catch (err) {
        const detail = err instanceof Error ? err.message : 'Please try again.';
        setToast(`Could not ${add ? 'add' : 'remove'} ₹${amount.toLocaleString('en-IN')} tier. ${detail}`);
        setTimeout(() => setToast(null), 4000);
      } finally {
        setPendingKey(null);
      }
    });
  }

  async function handleStar(dealerId: string, amount: number, isCurrentDefault: boolean) {
    if (defaultPending !== null || pendingKey !== null) return;
    setDefaultPending(`${dealerId}:${amount}`);
    try {
      const res = isCurrentDefault
        ? await unsetDefaultPriceTier(dealerId)
        : await setDefaultPriceTier(dealerId, amount);
      if (res?.error) {
        setToast(`Could not update default: ${res.error}`);
        setTimeout(() => setToast(null), 4000);
      }
    } catch {
      setToast('Default update failed. Please try again.');
      setTimeout(() => setToast(null), 4000);
    } finally {
      setDefaultPending(null);
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100">
          <h3 className="font-semibold">Per-User Assignments</h3>
        </div>

        {optimisticDealers.length === 0 ? (
          <div className="py-12 text-center text-sm text-stone-400">
            No dealers found
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {optimisticDealers.map(d => (
              <div
                key={d.id}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                {/* Dealer identity */}
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-red-500 flex items-center justify-center font-bold text-white text-xs shrink-0">
                    {initials(d.full_name)}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{d.full_name}</div>
                    <div className="text-xs text-stone-500">{d.location ?? 'No location set'}</div>
                  </div>
                </div>

                {/* Toggle pills — one per price in the global list */}
                {allPrices.length === 0 ? (
                  <p className="text-xs text-stone-400">No price tiers configured</p>
                ) : (
                  <div className="flex gap-2 flex-wrap items-center">
                    {allPrices.map(p => {
                      const active = d.amounts.includes(p);
                      const key = `${d.id}:${p}`;
                      const isThisPending = pendingKey === key;
                      const isThisDefault = d.defaultAmount === p;
                      const isStarPending = defaultPending === key;

                      return (
                        <div key={p} className="flex items-center gap-0.5">
                          <button
                            onClick={() => toggle(d.id, p)}
                            disabled={pendingKey !== null}
                            title={active ? `Remove ₹${p} from ${d.full_name}` : `Assign ₹${p} to ${d.full_name}`}
                            className={`
                              px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                              disabled:cursor-not-allowed
                              ${isThisPending ? 'opacity-50 cursor-wait' : ''}
                              ${active
                                ? 'bg-slate-900 text-white hover:bg-slate-700 disabled:hover:bg-slate-900'
                                : 'bg-stone-100 text-stone-400 hover:bg-stone-200 disabled:hover:bg-stone-100'
                              }
                            `}
                          >
                            ₹{p.toLocaleString('en-IN')}
                          </button>
                          {active && (
                            <button
                              onClick={() => handleStar(d.id, p, isThisDefault)}
                              disabled={defaultPending !== null || pendingKey !== null}
                              title={isThisDefault ? `Clear default for ${d.full_name}` : `Set ₹${p.toLocaleString('en-IN')} as default for ${d.full_name}`}
                              className={`p-1 rounded transition-colors disabled:cursor-not-allowed ${
                                isStarPending ? 'opacity-40 cursor-wait' : 'hover:bg-stone-100'
                              }`}
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${isThisDefault ? 'text-amber-500' : 'text-stone-300'}`}
                                fill={isThisDefault ? 'currentColor' : 'none'}
                              />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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
