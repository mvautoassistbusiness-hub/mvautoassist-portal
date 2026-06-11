'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, User, Lock, Eye, EyeOff, ChevronRight, CheckCircle2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');   // email OR username
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);

  async function handleSubmit() {
    setError('');

    const loginTrimmed = login.trim();
    if (!loginTrimmed) {
      setError('Email or username is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    // Dealers log in with username (no @); admins use their real email.
    const email = loginTrimmed.includes('@')
      ? loginTrimmed
      : `${loginTrimmed}@mvautoassist.in`;

    setLoading(true);
    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setLoading(false);
      setError('Invalid email or password.');
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role, full_name')
      .eq('id', authData.user.id)
      .single();

    setLoading(false);

    if (profileError || !profile) {
      setError('Profile not found. Contact admin.');
      return;
    }

    if (profile.role === 'admin') {
      router.push('/admin/dashboard');
    } else if (profile.role === 'dealer') {
      router.push('/agent/certificates');
    } else {
      setError('Invalid user role. Contact admin.');
    }
  }

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="min-h-screen flex bg-stone-50 text-slate-900">

      {/* Left panel — brand */}
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
        <div
          className="absolute top-20 -right-32 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: '#f59e0b' }}
        />
        <div
          className="absolute bottom-0 -left-32 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: '#dc2626' }}
        />

        <div className="relative z-10 flex flex-col justify-between p-14 w-full text-white">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)' }}
            >
              <Shield className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-bold text-xl tracking-tight">MVAutoAssist</div>
              <div className="text-xs text-amber-200/70 tracking-[0.2em] uppercase">
                Service Certificate Portal
              </div>
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              System operational — 4,847 certificates issued this month
            </div>
            <h1
              style={{ fontFamily: "'Instrument Serif', serif" }}
              className="text-6xl leading-[1.05] tracking-tight mb-4"
            >
              Protection for <em className="text-amber-300">every mile</em>.
            </h1>
            <p className="text-stone-300 text-lg max-w-md leading-relaxed">
              Issue, manage, and track road-side assistance certificates across your dealer
              network — all from one secure portal.
            </p>
          </div>

          <div className="flex items-center gap-8 text-sm text-stone-400">
            <div>
              <div className="text-2xl font-bold text-white">24/7</div>
              <div className="text-xs uppercase tracking-wider">Toll-free support</div>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div>
              <div className="text-2xl font-bold text-white">180+</div>
              <div className="text-xs uppercase tracking-wider">Partner dealers</div>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div>
              <div className="text-2xl font-bold text-white">99.9%</div>
              <div className="text-xs uppercase tracking-wider">Uptime</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div
              className="w-11 h-11 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)' }}
            >
              <Shield className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-bold text-xl tracking-tight">MVAutoAssist</div>
              <div className="text-xs text-stone-500 tracking-[0.15em] uppercase">
                Certificate Portal
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2
              style={{ fontFamily: "'Instrument Serif', serif" }}
              className="text-4xl tracking-tight mb-2"
            >
              Welcome back.
            </h2>
            <p className="text-stone-500">Sign in to manage your service certificates.</p>
          </div>

          {showForgot ? (
            /* ── Forgot password ── */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-sm font-semibold text-amber-900 mb-1">Reset your password</p>
                <p className="text-sm text-amber-700 leading-relaxed">
                  Contact your admin to reset your password. They can generate a new temporary
                  password from the <strong>Users &amp; Roles</strong> page.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="flex items-center gap-1.5 text-sm font-medium text-slate-900 hover:underline"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                Back to sign in
              </button>
            </div>
          ) : (
            /* ── Sign in form ── */
            <div className="space-y-4">

              {/* Email or username */}
              <div>
                <label className="block text-xs font-semibold tracking-wider uppercase text-stone-500 mb-2">
                  Email or Username
                </label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={login}
                    onChange={e => setLogin(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                    placeholder="Email or dealer username"
                    autoComplete="username"
                    className="w-full pl-12 pr-4 py-3.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold tracking-wider uppercase text-stone-500">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-xs text-slate-900 hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-slate-900"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <p className="text-sm text-red-600 font-medium">{error}</p>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-3.5 rounded-lg text-white font-semibold flex items-center justify-center gap-2 transition-all hover:shadow-lg active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
                style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1a2744 100%)' }}
              >
                {loading ? 'Signing in…' : <>Sign in <ChevronRight className="w-4 h-4" /></>}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 py-3">
                <div className="flex-1 h-px bg-stone-200" />
                <span className="text-xs text-stone-400 uppercase tracking-wider">Secured by</span>
                <div className="flex-1 h-px bg-stone-200" />
              </div>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-6 text-xs text-stone-500">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />256-bit SSL
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />OTP enabled
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />RBAC
                </span>
              </div>
            </div>
          )}

          <p className="text-center text-sm text-stone-500 mt-8">
            New dealer?{' '}
            <a href="/register" className="font-semibold text-slate-900 hover:underline">
              Register with your showroom code
            </a>
          </p>
          <p className="text-center text-xs text-stone-400 mt-4">
            Shreevardhan Services · Kolhapur, Maharashtra · © 2026
          </p>
        </div>
      </div>
    </div>
  );
}
