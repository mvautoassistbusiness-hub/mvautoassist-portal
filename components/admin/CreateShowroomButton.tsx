'use client';

import { useState, useTransition } from 'react';
import { Plus, X, Building2, Copy, Check } from 'lucide-react';
import { createShowroom } from '@/app/admin/showrooms/actions';

export default function CreateShowroomButton() {
  const [open,       setOpen]       = useState(false);
  const [name,       setName]       = useState('');
  const [error,      setError]      = useState('');
  const [result,     setResult]     = useState<{ name: string; join_code: string } | null>(null);
  const [copied,     setCopied]     = useState(false);
  const [isPending,  startTransition] = useTransition();

  function openModal() {
    setOpen(true);
    setName('');
    setError('');
    setResult(null);
    setCopied(false);
  }

  function closeModal() {
    setOpen(false);
    setResult(null);
  }

  async function handleCopy(code: string) {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCreate() {
    setError('');
    startTransition(async () => {
      const r = await createShowroom(name);
      if (r.ok) setResult({ name: r.showroom.name, join_code: r.showroom.join_code });
      else      setError(r.error);
    });
  }

  return (
    <>
      <button
        onClick={openModal}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
      >
        <Plus className="w-4 h-4" />
        New showroom
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />

          {/* Modal */}
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-stone-600" />
                </div>
                <h2 className="font-semibold text-lg">
                  {result ? 'Showroom created' : 'Create showroom'}
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="text-stone-400 hover:text-slate-900 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {result ? (
              /* ── Success — show the join code ── */
              <div className="space-y-4">
                <p className="text-sm text-stone-600">
                  <strong>{result.name}</strong> is ready. Share the code below with your dealers.
                </p>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-2">
                    Join Code
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <span
                      style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.2em' }}
                      className="text-2xl font-bold text-amber-900"
                    >
                      {result.join_code}
                    </span>
                    <button
                      onClick={() => handleCopy(result.join_code)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-sm font-medium transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-amber-600 mt-2">
                    Dealers use this code at <strong>/register</strong> to create their account.
                  </p>
                </div>

                <button
                  onClick={closeModal}
                  className="w-full py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              /* ── Form ── */
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                    Showroom Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                    placeholder="e.g. Star Motors Kolhapur"
                    autoFocus
                    className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:border-slate-900 text-sm transition-colors"
                  />
                </div>

                {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

                <p className="text-xs text-stone-400">
                  A unique 7-character join code will be generated automatically.
                </p>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={closeModal}
                    className="flex-1 py-2.5 rounded-lg border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={isPending || !name.trim()}
                    className="flex-1 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isPending ? 'Creating…' : 'Create showroom'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
