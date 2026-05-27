'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, User, Lock, Eye, EyeOff, ChevronRight, CheckCircle2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setError('');

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

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
        {/* decorative grid */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* amber glow */}
        <div
          className="absolute top-20 -right-32 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: '#f59e0b' }}
        />
        <div
          className="absolute bottom-0 -left-32 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: '#dc2626' }}
        />

        <div className="relative z-10 flex flex-col justify-between p-14 w-full text-white">
          {/* Logo */}
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

          {/* Hero copy */}
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

          {/* Stats footer */}
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

          {/* Mobile logo (hidden on desktop) */}
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

          {/* Heading */}
          <div className="mb-8">
            <h2
              style={{ fontFamily: "'Instrument Serif', serif" }}
              className="text-4xl tracking-tight mb-2"
            >
              Welcome back.
            </h2>
            <p className="text-stone-500">Sign in to manage your service certificates.</p>
          </div>

          {/* Role toggle — UI only, role is determined by the database */}
          <div className="flex gap-2 p-1 bg-stone-100 rounded-lg mb-6">
            {[
              { v: 'admin', label: 'Admin' },
              { v: 'agent', label: 'Dealer / Agent' },
            ].map(opt => (
              <button
                key={opt.v}
                onClick={() => setSelectedRole(opt.v)}
                className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all ${
                  selectedRole === opt.v
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-stone-500 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold tracking-wider uppercase text-stone-500 mb-2">
                Email
              </label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                  placeholder="vilas@example.com"
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
                <button className="text-xs text-slate-900 hover:underline font-medium">
                  Forgot?
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

          {/* Footer */}
          <p className="text-center text-xs text-stone-400 mt-10">
            Shreevardhan Services · Kolhapur, Maharashtra · © 2026
          </p>
        </div>
      </div>
    </div>
  );
}
