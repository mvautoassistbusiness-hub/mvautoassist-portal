'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { updateUser } from '@/app/admin/users/actions';

type Phase = 'closed' | 'form' | 'submitting';

type FormState = {
  full_name: string;
  role: 'admin' | 'dealer';
  location: string;
};

type Props = {
  userId: string;
  currentName: string;
  currentRole: 'admin' | 'dealer';
  currentLocation: string | null;
};

export default function EditUserButton({ userId, currentName, currentRole, currentLocation }: Props) {
  const [phase, setPhase]             = useState<Phase>('closed');
  const [form,  setForm]              = useState<FormState>({ full_name: '', role: 'dealer', location: '' });
  const [fieldError, setFieldError]   = useState<Partial<Record<keyof FormState, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [toast, setToast]             = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  function open() {
    setForm({ full_name: currentName, role: currentRole, location: currentLocation ?? '' });
    setFieldError({});
    setServerError(null);
    setPhase('form');
  }

  function close() {
    if (phase === 'submitting') return;
    setPhase('closed');
  }

  function validate(): boolean {
    const errs: typeof fieldError = {};
    if (form.full_name.trim().length < 2) errs.full_name = 'Name must be at least 2 characters';
    if (!['admin', 'dealer'].includes(form.role)) errs.role = 'Select a valid role';
    setFieldError(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setServerError(null);
    setPhase('submitting');

    const result = await updateUser({
      id:        userId,
      full_name: form.full_name,
      role:      form.role,
      location:  form.location || undefined,
    });

    if (!result.ok) {
      setServerError(result.error);
      setPhase('form');
      return;
    }

    setPhase('closed');
    showToast('User updated successfully');
  }

  if (phase === 'closed') {
    return (
      <>
        <button
          onClick={open}
          className="text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors"
        >
          Edit
        </button>
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg whitespace-nowrap">
            {toast}
          </div>
        )}
      </>
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
              Edit user
            </h2>
            <button
              onClick={close}
              disabled={phase === 'submitting'}
              className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors disabled:opacity-40"
            >
              <X className="w-4 h-4 text-stone-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">

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
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                ) : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
