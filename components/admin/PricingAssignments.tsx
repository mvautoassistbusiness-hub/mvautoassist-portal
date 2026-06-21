'use client';

import { useOptimistic, useTransition, useState } from 'react';
import { Star, Trash2 } from 'lucide-react';
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
  showroom: { id: string; name: string } | null;
  tiers: { id: string; amount: number; is_default: boolean }[];
};

type OptAction =
  | { type: 'remove';       userId: string; amount: number }
  | { type: 'set_default';  userId: string; amount: number }
  | { type: 'unset_default'; userId: string };

// ─── helpers ─────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function fmt(amount: number): string {
  return new Intl.NumberFormat('en-IN').format(amount);
}

// ─── component ───────────────────────────────────────────────────────────────

export default function PricingAssignments({ dealers, showrooms }: { dealers: DealerWithPrices[]; showrooms: { id: string; name: string }[] }) {
  const [, startTransition] = useTransition();

  // Mutation guards — one of each type at a time
  const [pendingKey,    setPendingKey]    = useState<string | null>(null);
  const [defaultPending, setDefaultPending] = useState<string | null>(null);
  const [addPendingId,  setAddPendingId]  = useState<string | null>(null);

  // Showroom filter
  const [showroomFilter, setShowroomFilter] = useState('all');

  // Per-dealer "add" input state
  const [addInputs, setAddInputs] = useState<Record<string, string>>({});
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});

  // Floating error toast for remove/default failures
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  // Optimistic state — handles remove + default changes instantly
  const [optimisticDealers, dispatch] = useOptimistic(
    dealers,
    (current: DealerWithPrices[], action: OptAction): DealerWithPrices[] => {
      switch (action.type) {
        case 'remove':
          return current.map(d =>
            d.id !== action.userId ? d
              : { ...d, tiers: d.tiers.filter(t => t.amount !== action.amount) }
          );
        case 'set_default':
          return current.map(d =>
            d.id !== action.userId ? d
              : { ...d, tiers: d.tiers.map(t => ({ ...t, is_default: t.amount === action.amount })) }
          );
        case 'unset_default':
          return current.map(d =>
            d.id !== action.userId ? d
              : { ...d, tiers: d.tiers.map(t => ({ ...t, is_default: false })) }
          );
      }
    }
  );

  // ── remove ────────────────────────────────────────────────────────────────

  function handleRemove(userId: string, amount: number) {
    if (pendingKey !== null) return;
    const key = `rm:${userId}:${amount}`;
    setPendingKey(key);
    startTransition(async () => {
      dispatch({ type: 'remove', userId, amount });
      const res = await removePriceTier(userId, amount);
      if (res?.error) showToast(`Could not remove ₹${fmt(amount)}: ${res.error}`);
      setPendingKey(null);
    });
  }

  // ── default star ──────────────────────────────────────────────────────────

  function handleStar(dealerId: string, amount: number, isCurrentDefault: boolean) {
    if (defaultPending !== null || pendingKey !== null) return;
    const key = `star:${dealerId}:${amount}`;
    setDefaultPending(key);
    startTransition(async () => {
      if (isCurrentDefault) {
        dispatch({ type: 'unset_default', userId: dealerId });
        const res = await unsetDefaultPriceTier(dealerId);
        if (res?.error) showToast(`Could not clear default: ${res.error}`);
      } else {
        dispatch({ type: 'set_default', userId: dealerId, amount });
        const res = await setDefaultPriceTier(dealerId, amount);
        if (res?.error) showToast(`Could not set default: ${res.error}`);
      }
      setDefaultPending(null);
    });
  }

  // ── add ───────────────────────────────────────────────────────────────────

  async function handleAdd(dealerId: string) {
    if (addPendingId !== null) return;
    const raw = addInputs[dealerId] ?? '';
    const amount = parseInt(raw, 10);

    if (!Number.isInteger(amount) || amount < 500 || amount > 5000) {
      setAddErrors(e => ({ ...e, [dealerId]: 'Amount must be between ₹500 and ₹5,000' }));
      return;
    }

    setAddErrors(e => ({ ...e, [dealerId]: '' }));
    setAddPendingId(dealerId);
    const res = await addPriceTier(dealerId, amount);
    setAddPendingId(null);

    if (res?.error) {
      setAddErrors(e => ({ ...e, [dealerId]: res.error }));
    } else {
      setAddInputs(i => ({ ...i, [dealerId]: '' }));
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold">Per-Dealer Price Tiers</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Assign any RSA price between ₹500 and ₹5,000 to each dealer
            </p>
          </div>
          <select
            value={showroomFilter}
            onChange={e => setShowroomFilter(e.target.value)}
            className="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-slate-900 transition-colors bg-white shrink-0"
          >
            <option value="all">All showrooms</option>
            {showrooms.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
            <option value="unassigned">Unassigned</option>
          </select>
        </div>

        {(() => {
          const filteredDealers = optimisticDealers.filter(d => {
            if (showroomFilter === 'all') return true;
            if (showroomFilter === 'unassigned') return !d.showroom;
            return d.showroom?.id === showroomFilter;
          });
          return filteredDealers.length === 0 ? (
            <div className="py-12 text-center text-sm text-stone-400">
              {showroomFilter === 'all' ? 'No dealers found' : 'No dealers in this showroom'}
            </div>
          ) : (
          <div className="divide-y divide-stone-100">
            {filteredDealers.map(d => {
              const sorted = [...d.tiers].sort((a, b) => a.amount - b.amount);
              const isAddPending = addPendingId === d.id;

              return (
                <div key={d.id} className="px-6 py-5">

                  {/* Dealer identity */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-red-500 flex items-center justify-center font-bold text-white text-xs shrink-0">
                      {initials(d.full_name)}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{d.full_name}</div>
                      <div className="text-xs text-stone-500">
                        {d.showroom?.name ?? 'No showroom'}
                        {d.location && <> · {d.location}</>}
                      </div>
                    </div>
                  </div>

                  {/* Assigned tiers list */}
                  {sorted.length === 0 ? (
                    <p className="text-xs text-stone-400 mb-4">No tiers assigned yet</p>
                  ) : (
                    <div className="space-y-1.5 mb-4">
                      {sorted.map(t => {
                        const starKey    = `star:${d.id}:${t.amount}`;
                        const removeKey  = `rm:${d.id}:${t.amount}`;
                        const isStarPend = defaultPending === starKey;
                        const isRmPend   = pendingKey === removeKey;

                        return (
                          <div key={t.id} className="flex items-center gap-2 group">

                            {/* Default star */}
                            <button
                              onClick={() => handleStar(d.id, t.amount, t.is_default)}
                              disabled={defaultPending !== null || pendingKey !== null}
                              title={t.is_default ? 'Clear default' : 'Set as default'}
                              className={`p-1 rounded transition-colors shrink-0 disabled:cursor-not-allowed ${
                                isStarPend ? 'opacity-40 cursor-wait' : 'hover:bg-stone-100'
                              }`}
                            >
                              <Star
                                className={`w-4 h-4 ${t.is_default ? 'text-amber-500' : 'text-stone-300'}`}
                                fill={t.is_default ? 'currentColor' : 'none'}
                              />
                            </button>

                            {/* Amount */}
                            <span className="flex-1 text-sm font-semibold">
                              ₹{fmt(t.amount)}
                            </span>

                            {/* Default badge */}
                            {t.is_default && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 px-1.5 py-0.5 rounded bg-amber-50">
                                Default
                              </span>
                            )}

                            {/* Remove */}
                            <button
                              onClick={() => handleRemove(d.id, t.amount)}
                              disabled={pendingKey !== null}
                              title={`Remove ₹${fmt(t.amount)}`}
                              className={`p-1 rounded text-stone-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 disabled:cursor-not-allowed ${
                                isRmPend ? 'opacity-40 cursor-wait' : 'opacity-0 group-hover:opacity-100'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add price input */}
                  <div>
                    <div className="flex gap-2">
                      <div className="relative flex-1 max-w-[180px]">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm select-none pointer-events-none">
                          ₹
                        </span>
                        <input
                          type="number"
                          min={500}
                          max={5000}
                          step={1}
                          value={addInputs[d.id] ?? ''}
                          onChange={e => {
                            setAddInputs(i => ({ ...i, [d.id]: e.target.value }));
                            if (addErrors[d.id]) setAddErrors(err => ({ ...err, [d.id]: '' }));
                          }}
                          onKeyDown={e => { if (e.key === 'Enter') handleAdd(d.id); }}
                          placeholder="e.g. 1500"
                          className={`w-full pl-8 pr-3 py-2 text-sm bg-stone-50 border rounded-lg focus:outline-none focus:bg-white transition-colors ${
                            addErrors[d.id]
                              ? 'border-red-300 focus:border-red-500'
                              : 'border-stone-200 focus:border-slate-900'
                          }`}
                        />
                      </div>
                      <button
                        onClick={() => handleAdd(d.id)}
                        disabled={isAddPending}
                        className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isAddPending ? 'Adding…' : 'Add'}
                      </button>
                    </div>
                    {addErrors[d.id] ? (
                      <p className="text-xs text-red-600 font-medium mt-1.5">{addErrors[d.id]}</p>
                    ) : (
                      <p className="text-xs text-stone-400 mt-1.5">Allowed: ₹500–₹5,000</p>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
          );
        })()}
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
