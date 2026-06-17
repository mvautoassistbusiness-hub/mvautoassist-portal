'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { clearMustChangePassword } from './actions';

export default function ChangePasswordForm() {
  const router = useRouter();
  const [newPwd,     setNewPwd]     = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showNew,    setShowNew]    = useState(false);
  const [showConf,   setShowConf]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  async function handleSubmit() {
    setError('');

    if (newPwd.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: authErr } = await supabase.auth.updateUser({ password: newPwd });
    if (authErr) {
      setError(authErr.message);
      setLoading(false);
      return;
    }

    const result = await clearMustChangePassword();
    if (!result.ok) {
      setError(`Password changed but flag clear failed: ${result.error}. Please log out and log in again.`);
      setLoading(false);
      return;
    }

    router.push('/agent/certificates');
  }

  return (
    <div
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      className="min-h-screen flex items-center justify-center bg-stone-50 p-8 text-slate-900"
    >
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)' }}
          >
            <Shield className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-bold text-xl tracking-tight">MVAutoAssist</div>
            <div className="text-xs text-stone-500 tracking-[0.15em] uppercase">Certificate Portal</div>
          </div>
        </div>

        <h2
          style={{ fontFamily: "'Instrument Serif', serif" }}
          className="text-4xl tracking-tight mb-2"
        >
          Set new password
        </h2>
        <p className="text-stone-500 mb-8">
          Your password has been reset by an admin. You must set a new password before you can continue.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold tracking-wider uppercase text-stone-500 mb-2">
              New password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full pl-12 pr-12 py-3.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-slate-900"
              >
                {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wider uppercase text-stone-500 mb-2">
              Confirm password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type={showConf ? 'text' : 'password'}
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="Re-enter password"
                className="w-full pl-12 pr-12 py-3.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConf(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-slate-900"
              >
                {showConf ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 font-medium">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3.5 rounded-lg text-white font-semibold flex items-center justify-center gap-2 transition-all hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1a2744 100%)' }}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : 'Set new password'}
          </button>
        </div>
      </div>
    </div>
  );
}
