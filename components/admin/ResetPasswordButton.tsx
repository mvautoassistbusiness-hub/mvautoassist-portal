'use client';

import { useState } from 'react';
import { KeyRound, Loader2, Copy, CheckCheck, X } from 'lucide-react';
import { resetDealerPassword } from '@/app/admin/users/actions';

type Phase = 'idle' | 'confirm' | 'submitting' | 'done';

export default function ResetPasswordButton({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const [phase, setPhase]         = useState<Phase>('idle');
  const [tempPwd, setTempPwd]     = useState('');
  const [error, setError]         = useState<string | null>(null);
  const [copied, setCopied]       = useState(false);

  async function handleReset() {
    setError(null);
    setPhase('submitting');
    const result = await resetDealerPassword(userId);
    if (!result.ok) {
      setError(result.error);
      setPhase('confirm');
      return;
    }
    setTempPwd(result.tempPassword);
    setPhase('done');
  }

  async function copyPassword() {
    await navigator.clipboard.writeText(tempPwd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (phase === 'idle') {
    return (
      <button
        onClick={() => setPhase('confirm')}
        className="text-xs font-semibold text-red-600 hover:text-red-800 transition-colors"
      >
        Reset pwd
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={() => { if (phase !== 'submitting') { setPhase('idle'); setError(null); } }}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-red-500" />
              <h2
                style={{ fontFamily: "'Instrument Serif', serif" }}
                className="text-xl tracking-tight"
              >
                Reset password
              </h2>
            </div>
            {phase !== 'submitting' && (
              <button
                onClick={() => { setPhase('idle'); setError(null); }}
                className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
              >
                <X className="w-4 h-4 text-stone-500" />
              </button>
            )}
          </div>

          <div className="px-6 py-6 space-y-4">
            {phase === 'done' ? (
              <>
                <p className="text-sm text-stone-600">
                  Password reset for <strong>{userName}</strong>. Share this
                  temporary password — they must change it on next login.
                </p>

                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <span
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    className="flex-1 text-sm font-semibold text-slate-900 select-all"
                  >
                    {tempPwd}
                  </span>
                  <button
                    onClick={copyPassword}
                    className="p-1.5 rounded hover:bg-amber-100 transition-colors shrink-0"
                    title="Copy to clipboard"
                  >
                    {copied
                      ? <CheckCheck className="w-4 h-4 text-emerald-600" />
                      : <Copy className="w-4 h-4 text-amber-700" />}
                  </button>
                </div>

                <button
                  onClick={() => { setPhase('idle'); setTempPwd(''); }}
                  className="w-full py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
                >
                  Done
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-stone-600">
                  This will generate a new temporary password for{' '}
                  <strong>{userName}</strong> and require them to change it
                  on their next login.
                </p>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => { setPhase('idle'); setError(null); }}
                    disabled={phase === 'submitting'}
                    className="flex-1 py-2.5 rounded-lg border border-stone-200 text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={phase === 'submitting'}
                    className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {phase === 'submitting'
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting…</>
                      : 'Reset password'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
