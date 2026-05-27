'use client';

import { useState, useRef } from 'react';
import { Plus, X, Copy, Check, Loader2 } from 'lucide-react';
import { createUser } from '@/app/admin/users/actions';
import type { CreateUserInput } from '@/app/admin/users/actions';

type Phase = 'closed' | 'form' | 'submitting' | 'success';

type FormState = CreateUserInput & { location: string };

const INITIAL: FormState = { email: '', full_name: '', role: 'dealer', location: '' };

export default function NewUserButton() {
  const [phase, setPhase]             = useState<Phase>('closed');
  const [form,  setForm]              = useState<FormState>(INITIAL);
  const [fieldError, setFieldError]   = useState<Partial<Record<keyof FormState, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied]           = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  function open() {
    setForm(INITIAL);
    setFieldError({});
    setServerError(null);
    setPhase('form');
    setTimeout(() => emailRef.current?.focus(), 50);
  }

  function close() {
    if (phase === 'submitting') return;
    setPhase('closed');
  }

  function validate(): boolean {
    const errs: typeof fieldError = {};
    if (!form.email.includes('@'))            errs.email     = 'Enter a valid email address';
    if (form.full_name.trim().length < 2)     errs.full_name = 'Name must be at least 2 characters';
    if (!['admin', 'dealer'].includes(form.role)) errs.role  = 'Select a valid role';
    setFieldError(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setServerError(null);
    setPhase('submitting');

    const result = await createUser({
      email:     form.email,
      full_name: form.full_name,
      role:      form.role,
      location:  form.location || undefined,
    });

    if (!result.ok) {
      setServerError(result.error);
      setPhase('form');
      return;
    }

    setTempPassword(result.tempPassword);
    setCopied(false);
    setPhase('success');
  }

  async function copyPassword() {
    await navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (phase === 'closed') {
    return (
      <button
        onClick={open}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
      >
        <Plus className="w-4 h-4" />
        New user
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={close} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200">
            <h2
              style={{ fontFamily: "'Instrument Serif', serif" }}
              className="text-2xl tracking-tight"
            >
              {phase === 'success' ? 'User created' : 'New user'}
            </h2>
            <button
              onClick={close}
              disabled={phase === 'submitting'}
              className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors disabled:opacity-40"
            >
              <X className="w-4 h-4 text-stone-500" />
            </button>
          </div>

          {phase === 'success' ? (
            /* ── Success ── */
            <div className="px-6 py-6 space-y-4">
              <p className="text-sm text-stone-600">
                Account created for <strong>{form.full_name}</strong>. Share this temporary
                password with the user — it will not be shown again.
              </p>
              <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-4 py-3">
                <code
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  className="flex-1 text-sm text-slate-800 tracking-wide select-all"
                >
                  {tempPassword}
                </code>
                <button
                  onClick={copyPassword}
                  className="p-1.5 rounded hover:bg-stone-200 transition-colors"
                  title="Copy password"
                >
                  {copied
                    ? <Check className="w-4 h-4 text-emerald-600" />
                    : <Copy className="w-4 h-4 text-stone-500" />}
                </button>
              </div>
              <button
                onClick={close}
                className="w-full py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            /* ── Form ── */
            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                  Email address <span className="text-red-500">*</span>
                </label>
                <input
                  ref={emailRef}
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  disabled={phase === 'submitting'}
                  placeholder="dealer@example.com"
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-slate-900 transition-colors disabled:opacity-60 ${
                    fieldError.email ? 'border-red-400 bg-red-50' : 'border-stone-200'
                  }`}
                />
                {fieldError.email && <p className="text-xs text-red-500 mt-1">{fieldError.email}</p>}
              </div>

              {/* Full name */}
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                  Full name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  disabled={phase === 'submitting'}
                  placeholder="Rajesh Kumar"
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-slate-900 transition-colors disabled:opacity-60 ${
                    fieldError.full_name ? 'border-red-400 bg-red-50' : 'border-stone-200'
                  }`}
                />
                {fieldError.full_name && <p className="text-xs text-red-500 mt-1">{fieldError.full_name}</p>}
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'dealer' }))}
                  disabled={phase === 'submitting'}
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-slate-900 transition-colors disabled:opacity-60 bg-white"
                >
                  <option value="dealer">Dealer</option>
                  <option value="admin">Admin</option>
                </select>
                {fieldError.role && <p className="text-xs text-red-500 mt-1">{fieldError.role}</p>}
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                  Location <span className="text-stone-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  disabled={phase === 'submitting'}
                  placeholder="Pune, Maharashtra"
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-slate-900 transition-colors disabled:opacity-60"
                />
              </div>

              {/* Server error */}
              {serverError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {serverError}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={close}
                  disabled={phase === 'submitting'}
                  className="flex-1 py-2.5 rounded-lg border border-stone-200 text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={phase === 'submitting'}
                  className="flex-1 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {phase === 'submitting' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                  ) : 'Create user'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
