'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Shield, User, Lock, Eye, EyeOff, Hash, CheckCircle2, ChevronRight } from 'lucide-react';
import { registerDealer } from './actions';

export default function RegisterPage() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ username: string; showroomName: string } | null>(null);
  const [error,  setError]  = useState('');

  // form fields
  const [fullName,   setFullName]   = useState('');
  const [joinCode,   setJoinCode]   = useState('');
  const [password,   setPassword]   = useState('');
  const [confirm,    setConfirm]    = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [showConf,   setShowConf]   = useState(false);

  function handleSubmit() {
    setError('');
    startTransition(async () => {
      const r = await registerDealer({
        full_name:        fullName,
        join_code:        joinCode,
        password,
        confirm_password: confirm,
      });
      if (r.ok) setResult({ username: r.username, showroomName: r.showroomName });
      else      setError(r.error);
    });
  }

  return (
    <div
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      className="min-h-screen flex bg-stone-50 text-slate-900"
    >
      {/* Left brand panel — mirrors login page */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1a2744 60%, #0a1628 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute top-20 -right-32 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: '#f59e0b' }} />
        <div className="absolute bottom-0 -left-32 w-96 h-96 rounded-full opacity-10 blur-3xl"  style={{ background: '#dc2626' }} />

        <div className="relative z-10 flex flex-col justify-between p-14 w-full text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)' }}>
              <Shield className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-bold text-xl tracking-tight">MVAutoAssist</div>
              <div className="text-xs text-amber-200/70 tracking-[0.2em] uppercase">Service Certificate Portal</div>
            </div>
          </div>

          <div>
            <h1 style={{ fontFamily: "'Instrument Serif', serif" }} className="text-6xl leading-[1.05] tracking-tight mb-4">
              Join your <em className="text-amber-300">showroom</em>.
            </h1>
            <p className="text-stone-300 text-lg max-w-md leading-relaxed">
              Enter the join code your showroom manager gave you to create your dealer account instantly.
            </p>
          </div>

          <div className="flex items-center gap-8 text-sm text-stone-400">
            <div><div className="text-2xl font-bold text-white">24/7</div><div className="text-xs uppercase tracking-wider">Toll-free support</div></div>
            <div className="w-px h-10 bg-white/20" />
            <div><div className="text-2xl font-bold text-white">180+</div><div className="text-xs uppercase tracking-wider">Partner dealers</div></div>
            <div className="w-px h-10 bg-white/20" />
            <div><div className="text-2xl font-bold text-white">99.9%</div><div className="text-xs uppercase tracking-wider">Uptime</div></div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)' }}>
              <Shield className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-bold text-xl tracking-tight">MVAutoAssist</div>
              <div className="text-xs text-stone-500 tracking-[0.15em] uppercase">Dealer Registration</div>
            </div>
          </div>

          {result ? (
            /* ── Success state ── */
            <div className="space-y-6">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="text-center">
                <h2 style={{ fontFamily: "'Instrument Serif', serif" }} className="text-3xl tracking-tight mb-2">
                  You're registered!
                </h2>
                <p className="text-stone-500">Your dealer account for <strong>{result.showroomName}</strong> is ready.</p>
              </div>

              <div className="bg-stone-50 border border-stone-200 rounded-xl p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Your username</p>
                <p style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-xl font-bold tracking-wide">
                  {result.username}
                </p>
                <p className="text-sm text-stone-500 mt-2">
                  Sign in with this username and the password you just set.
                </p>
              </div>

              <Link
                href="/login"
                className="w-full py-3.5 rounded-lg text-white font-semibold flex items-center justify-center gap-2 transition-all hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1a2744 100%)' }}
              >
                Go to sign in <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            /* ── Registration form ── */
            <>
              <div className="mb-8">
                <h2 style={{ fontFamily: "'Instrument Serif', serif" }} className="text-4xl tracking-tight mb-2">
                  Create account.
                </h2>
                <p className="text-stone-500">You'll need the join code from your showroom manager.</p>
              </div>

              <div className="space-y-4">
                {/* Full name */}
                <div>
                  <label className="block text-xs font-semibold tracking-wider uppercase text-stone-500 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                      placeholder="Rajesh Kumar"
                      autoComplete="name"
                      className="w-full pl-12 pr-4 py-3.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Showroom join code */}
                <div>
                  <label className="block text-xs font-semibold tracking-wider uppercase text-stone-500 mb-2">
                    Showroom Join Code
                  </label>
                  <div className="relative">
                    <Hash className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value.toUpperCase())}
                      onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                      placeholder="ABC1234"
                      autoComplete="off"
                      style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.15em' }}
                      className="w-full pl-12 pr-4 py-3.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white transition-all uppercase"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold tracking-wider uppercase text-stone-500 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                      placeholder="Min 8 characters"
                      autoComplete="new-password"
                      className="w-full pl-12 pr-12 py-3.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white transition-all"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-slate-900">
                      {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-xs font-semibold tracking-wider uppercase text-stone-500 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type={showConf ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                      className="w-full pl-12 pr-12 py-3.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white transition-all"
                    />
                    <button type="button" onClick={() => setShowConf(!showConf)} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-slate-900">
                      {showConf ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="w-full py-3.5 rounded-lg text-white font-semibold flex items-center justify-center gap-2 transition-all hover:shadow-lg active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1a2744 100%)' }}
                >
                  {isPending ? 'Creating account…' : <>Create account <ChevronRight className="w-4 h-4" /></>}
                </button>

                <p className="text-center text-sm text-stone-500">
                  Already have an account?{' '}
                  <Link href="/login" className="font-semibold text-slate-900 hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          )}

          <p className="text-center text-xs text-stone-400 mt-10">
            Shreevardhan Services · Kolhapur, Maharashtra · © 2026
          </p>
        </div>
      </div>
    </div>
  );
}
