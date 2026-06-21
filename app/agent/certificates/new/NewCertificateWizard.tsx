'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Bike, Car, Loader2 } from 'lucide-react';
import Field from '@/components/agent/Field';
import { getDealerPriceTiers, createCertificate } from './actions';
import type { CertFormData } from './actions';

// ─── helpers ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}
function oneYearHenceISO(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
}

// ─── form state ───────────────────────────────────────────────────────────────

type FormState = CertFormData;
type Errors = Partial<Record<keyof FormState, string>>;

const INITIAL: FormState = {
  customer_name: '', customer_dob: '', customer_mobile: '',
  customer_email: '', customer_address: '',
  vehicle_type: 'Two Wheeler', registration_no: '', make_model: '',
  variant: '', engine_no: '', chassis_no: '', fuel_type: 'Petrol',
  manufacturing_year: '',
  start_date: todayISO(),
  end_date:   oneYearHenceISO(),
  insurance_amount: '', rsa_amount: '',
  payment_method: '', payment_reference: '',
};

const VEHICLE_TYPES = ['Two Wheeler', 'Four Wheeler'] as const;
const FUEL_TYPES    = ['Petrol', 'Diesel', 'Electric', 'CNG', 'Hybrid'] as const;

const PAYMENT_METHODS = ['cash', 'upi', 'card', 'cheque', 'bank_transfer'] as const;
const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash', upi: 'UPI', card: 'Card', cheque: 'Cheque', bank_transfer: 'Bank Transfer',
};

// ─── India-format vehicle field validation ───────────────────────────────────

const INDIAN_STATE_CODES = new Set([
  'AP','AR','AS','BR','CG','GA','GJ','HR','HP','JH','KA','KL','MP','MH',
  'MN','ML','MZ','NL','OD','PB','RJ','SK','TN','TS','TR','UP','UK','WB',
  'AN','CH','DD','DL','JK','LA','LD','PY',
]);

function validateRegistrationNo(raw: string): string | null {
  const v = raw.replace(/[\s\-\.]/g, '').toUpperCase();
  if (!v || v === 'NEW') return null;
  if (v.length > 20) return 'Registration no too long (max 20 characters)';
  if (/^\d{2}BH\d{4}[A-Z]{1,2}$/.test(v)) return null;
  const m = v.match(/^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{1,4})$/);
  if (!m) return 'Invalid format, e.g. MH12AB1234 or DL8CAF5169';
  if (!INDIAN_STATE_CODES.has(m[1])) return `Unknown state code "${m[1]}"`;
  return null;
}

function validateChassisNo(raw: string): string | null {
  const v = raw.trim().toUpperCase();
  if (!v) return 'Chassis number (VIN) is required';
  if (v.length < 9 || v.length > 17) return `Chassis number must be 9–17 characters (entered ${v.length})`;
  if (/[IOQ]/.test(v)) return 'Letters I, O, Q are not valid in chassis numbers';
  if (!/^[A-HJ-NPR-Z0-9]+$/.test(v)) return 'Chassis number must be alphanumeric only';
  return null;
}

function validateEngineNo(raw: string): string | null {
  const v = raw.trim();
  if (!v) return 'Engine number is required';
  if (v.length < 5) return 'Engine number too short (min 5 characters)';
  if (v.length > 25) return 'Engine number too long (max 25 characters)';
  if (!/^[A-Za-z0-9][A-Za-z0-9\-\/]*[A-Za-z0-9]$/.test(v))
    return 'Engine number must be alphanumeric (hyphens/slashes allowed, no spaces)';
  return null;
}

// ─── validation ───────────────────────────────────────────────────────────────

function validateStep1(f: FormState): Errors {
  const e: Errors = {};
  if (!f.customer_name.trim() || f.customer_name.trim().length < 2)
    e.customer_name = 'Name is required';
  else if (f.customer_name.trim().length > 60)
    e.customer_name = 'Name is too long (max 60 characters)';
  if (!/^\d{10}$/.test(f.customer_mobile))
    e.customer_mobile = 'Enter a valid 10-digit mobile';
  if (f.customer_dob) {
    const dob = new Date(f.customer_dob + 'T00:00:00');
    if (isNaN(dob.getTime()) || dob > new Date() || dob.getFullYear() < 1900)
      e.customer_dob = 'Enter a valid date of birth (not in the future, after 1900)';
  }
  if (f.customer_email && f.customer_email.length > 100)
    e.customer_email = 'Email is too long (max 100 characters)';
  if (f.customer_address && f.customer_address.length > 300)
    e.customer_address = 'Address is too long (max 300 characters)';
  return e;
}

function validateStep2(f: FormState): Errors {
  const e: Errors = {};
  const currentYear = new Date().getFullYear();
  if (!(VEHICLE_TYPES as readonly string[]).includes(f.vehicle_type))
    e.vehicle_type = 'Select a vehicle type';
  if (f.registration_no.trim()) {
    const regErr = validateRegistrationNo(f.registration_no);
    if (regErr) e.registration_no = regErr;
  }
  if (!f.make_model.trim() || f.make_model.trim().length < 2)
    e.make_model = 'Vehicle make and model required';
  else if (f.make_model.trim().length > 60)
    e.make_model = 'Make & model too long (max 60 characters)';
  if (f.variant && f.variant.trim().length > 60)
    e.variant = 'Variant too long (max 60 characters)';
  const yr = parseInt(f.manufacturing_year, 10);
  if (!f.manufacturing_year || isNaN(yr) || yr < 1990 || yr > currentYear)
    e.manufacturing_year = `Enter a valid manufacturing year (1990–${currentYear})`;
  const engineErr = validateEngineNo(f.engine_no);
  if (engineErr) e.engine_no = engineErr;
  const chassisErr = validateChassisNo(f.chassis_no);
  if (chassisErr) e.chassis_no = chassisErr;
  if (!(FUEL_TYPES as readonly string[]).includes(f.fuel_type))
    e.fuel_type = 'Select a fuel type';
  return e;
}

function validateStep3(f: FormState, tiers: { amount: number; is_default: boolean }[]): Errors {
  const e: Errors = {};
  if (!f.start_date) e.start_date = 'Start date required';
  if (!f.end_date)   e.end_date   = 'End date required';
  if (f.start_date && f.end_date && f.end_date <= f.start_date)
    e.end_date = 'End date must be after start date';
  const ins = parseFloat(f.insurance_amount);
  if (!f.insurance_amount || isNaN(ins) || ins <= 0)
    e.insurance_amount = 'Enter a valid insurance premium';
  const rsa = parseFloat(f.rsa_amount);
  if (!f.rsa_amount || isNaN(rsa) || rsa <= 0)
    e.rsa_amount = 'Select an RSA premium tier';
  else if (!tiers.some(t => t.amount === rsa))
    e.rsa_amount = 'Selected tier is not assigned to your account';
  if (!(PAYMENT_METHODS as readonly string[]).includes(f.payment_method))
    e.payment_method = 'Select a payment method';
  if (f.payment_reference && f.payment_reference.length > 60)
    e.payment_reference = 'Reference too long (max 60 characters)';
  return e;
}

// ─── wizard ───────────────────────────────────────────────────────────────────

export default function NewCertificateWizard() {
  const router = useRouter();

  const [step,   setStep]   = useState(1);
  const [form,   setForm]   = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});

  // Step 3 — tier data
  const [tiers,      setTiers]      = useState<{ amount: number; is_default: boolean }[] | null>(null); // null = loading
  const [tiersError, setTiersError] = useState<string | null>(null);

  // Step 3 — submission
  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState<string | null>(null);
  const submittingRef = useRef(false);

  // Prefetch dealer's price tiers on mount so Step 3 is ready immediately
  useEffect(() => {
    getDealerPriceTiers().then(res => {
      if (res.ok) {
        setTiers(res.tiers);
        const def = res.tiers.find(t => t.is_default);
        if (def) setForm(f => ({ ...f, rsa_amount: String(def.amount) }));
      } else {
        setTiersError(res.error);
        setTiers([]);
      }
    });
  }, []);

  function update<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }));
  }

  async function handleContinue() {
    if (step === 1) {
      const errs = validateStep1(form);
      if (Object.keys(errs).length) { setErrors(errs); return; }
      setErrors({}); setStep(2); return;
    }
    if (step === 2) {
      const errs = validateStep2(form);
      if (Object.keys(errs).length) { setErrors(errs); return; }
      setErrors({}); setStep(3); return;
    }
    if (step === 3) {
      const errs = validateStep3(form, tiers ?? []);
      if (Object.keys(errs).length) { setErrors(errs); return; }
      if (submittingRef.current) return;
      submittingRef.current = true;
      setErrors({});
      setSubmitError(null);
      setSubmitting(true);
      try {
        const result = await createCertificate(form);
        if (result.ok) {
          router.replace(`/cert/${result.certId}`);
        } else {
          setSubmitError(result.error);
          submittingRef.current = false;
          setSubmitting(false);
        }
      } catch {
        submittingRef.current = false;
        setSubmitting(false);
      }
    }
  }

  function handleBack() {
    setErrors({});
    setSubmitError(null);
    setStep(s => Math.max(s - 1, 1));
  }

  // Derived totals for the breakdown card
  const insAmt = parseFloat(form.insurance_amount) || 0;
  const rsaAmt = parseFloat(form.rsa_amount) || 0;
  const totalAmt = insAmt + rsaAmt;

  return (
    <div className="min-h-full bg-stone-50">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-stone-200 px-6 lg:px-10 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="lg:hidden w-9 shrink-0" />
          <Link
            href="/agent/certificates"
            aria-label="Back to certificates"
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </Link>
          <div>
            <h1
              style={{ fontFamily: "'Instrument Serif', serif" }}
              className="text-3xl leading-none tracking-tight"
            >
              New Certificate
            </h1>
            <p className="text-xs text-stone-500 mt-1">Step {step} of 3</p>
          </div>
        </div>

        {/* Step progress pills */}
        <div className="hidden sm:flex items-center gap-1.5">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                i === step ? 'bg-slate-900 text-white' : 'bg-stone-200 text-stone-400'
              }`}
            >
              {i}
            </div>
          ))}
        </div>
      </div>

      {/* ── Form area ───────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto p-6 lg:p-10">

        {/* ── Step 1: Customer details ─────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 style={{ fontFamily: "'Instrument Serif', serif" }} className="text-2xl mb-1">
                Customer details
              </h2>
              <p className="text-sm text-stone-500">Who is this certificate for?</p>
            </div>
            <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
              <Field
                label="Full name"
                value={form.customer_name}
                onChange={v => update('customer_name', v)}
                placeholder="e.g. ANKUR SALUNKHE"
                error={errors.customer_name}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Date of birth (optional)" type="date" value={form.customer_dob} onChange={v => update('customer_dob', v)} error={errors.customer_dob} />
                <Field label="Mobile number" value={form.customer_mobile} onChange={v => update('customer_mobile', v)} placeholder="10-digit mobile number" error={errors.customer_mobile} />
              </div>
              <Field label="Email (optional)" type="email" value={form.customer_email} onChange={v => update('customer_email', v)} placeholder="customer@example.com" error={errors.customer_email} />
              <Field label="Address (optional)" value={form.customer_address} onChange={v => update('customer_address', v)} placeholder="Full postal address" textarea error={errors.customer_address} />
            </div>
          </div>
        )}

        {/* ── Step 2: Vehicle information ──────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 style={{ fontFamily: "'Instrument Serif', serif" }} className="text-2xl mb-1">Vehicle information</h2>
              <p className="text-sm text-stone-500">Details of the vehicle being insured</p>
            </div>
            <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold tracking-wider uppercase text-stone-500 mb-2">Vehicle type</label>
                <div className="grid grid-cols-2 gap-2">
                  {VEHICLE_TYPES.map(vt => (
                    <button key={vt} type="button" onClick={() => update('vehicle_type', vt)}
                      className={`p-4 rounded-lg border-2 flex items-center gap-3 transition-all ${form.vehicle_type === vt ? 'border-slate-900 bg-stone-50' : 'border-stone-200 hover:border-stone-300'}`}>
                      {vt === 'Two Wheeler' ? <Bike className="w-5 h-5" /> : <Car className="w-5 h-5" />}
                      <span className="font-semibold text-sm">{vt}</span>
                    </button>
                  ))}
                </div>
                {errors.vehicle_type && <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.vehicle_type}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Registration no (optional)" value={form.registration_no} onChange={v => update('registration_no', v)} placeholder="MH09 AB 1234 or 'New'" error={errors.registration_no} />
                <Field label="Make & Model" value={form.make_model} onChange={v => update('make_model', v)} placeholder="HONDA CB350RS" error={errors.make_model} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Variant" value={form.variant} onChange={v => update('variant', v)} placeholder="DLX PRO DUAL TONE" error={errors.variant} />
                <Field label="Manufacturing year" value={form.manufacturing_year} onChange={v => update('manufacturing_year', v)} placeholder="2025" error={errors.manufacturing_year} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Engine no" value={form.engine_no} onChange={v => update('engine_no', v)} placeholder="NC58EA3025933" error={errors.engine_no} />
                <Field label="Chassis no" value={form.chassis_no} onChange={v => update('chassis_no', v)} placeholder="ME4NC681JSA006238" error={errors.chassis_no} />
              </div>
              <div>
                <label className="block text-xs font-semibold tracking-wider uppercase text-stone-500 mb-2">Fuel type</label>
                <div className="flex gap-2 flex-wrap">
                  {FUEL_TYPES.map(ft => (
                    <button key={ft} type="button" onClick={() => update('fuel_type', ft)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${form.fuel_type === ft ? 'bg-slate-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                      {ft}
                    </button>
                  ))}
                </div>
                {errors.fuel_type && <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.fuel_type}</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Plan & pricing ───────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 style={{ fontFamily: "'Instrument Serif', serif" }} className="text-2xl mb-1">Plan &amp; pricing</h2>
              <p className="text-sm text-stone-500">Select coverage period and premium</p>
            </div>

            {/* Submission error banner */}
            {submitError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
                {submitError}
              </div>
            )}

            {/* Tier loading / empty state */}
            {tiers === null && (
              <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-400 text-sm">
                Loading your price options…
              </div>
            )}

            {tiers !== null && tiers.length === 0 && (
              <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center space-y-2">
                <p className="text-sm font-semibold text-stone-600">No price tiers assigned</p>
                <p className="text-xs text-stone-400">Your admin hasn&apos;t set up pricing for your account yet. Contact admin before creating certificates.</p>
              </div>
            )}

            {tiers !== null && tiers.length > 0 && (
              <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">

                {/* Coverage dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Start date" type="date" value={form.start_date} onChange={v => update('start_date', v)} error={errors.start_date} />
                  <Field label="End date"   type="date" value={form.end_date}   onChange={v => update('end_date', v)}   error={errors.end_date} />
                </div>

                {/* Insurance premium — manual text input with ₹ prefix */}
                <div>
                  <label className="block text-xs font-semibold tracking-wider uppercase text-stone-500 mb-2">
                    Insurance Premium
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 text-sm select-none">₹</span>
                    <input
                      type="number"
                      min="1"
                      value={form.insurance_amount}
                      onChange={e => update('insurance_amount', e.target.value)}
                      placeholder="Enter insurance premium amount"
                      className={`w-full pl-8 pr-4 py-3 bg-stone-50 border text-sm rounded-lg transition-colors focus:outline-none focus:bg-white ${
                        errors.insurance_amount ? 'border-red-300 focus:border-red-500' : 'border-stone-200 focus:border-slate-900'
                      }`}
                    />
                  </div>
                  {errors.insurance_amount && <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.insurance_amount}</p>}
                </div>

                {/* RSA premium — picker pills from assigned tiers (Vilas rule 10) */}
                <div>
                  <label className="block text-xs font-semibold tracking-wider uppercase text-stone-500 mb-2">
                    RSA Premium
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {tiers.map(t => {
                      const selected = parseFloat(form.rsa_amount) === t.amount;
                      return (
                        <button
                          key={t.amount}
                          type="button"
                          onClick={() => update('rsa_amount', String(t.amount))}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            selected
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          <div style={{ fontFamily: "'Instrument Serif', serif" }} className="text-2xl">
                            ₹{t.amount.toLocaleString('en-IN')}
                          </div>
                          <div className={`text-[10px] uppercase tracking-wider mt-1 ${selected ? 'opacity-70' : 'text-stone-400'}`}>
                            Assigned tier
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-stone-400 mt-2">Your admin has assigned these price tiers to you</p>
                  {errors.rsa_amount && <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.rsa_amount}</p>}
                </div>

                {/* Total breakdown — live, server will recalculate on submit */}
                <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 space-y-2">
                  <div className="flex justify-between text-sm text-stone-500">
                    <span>Insurance Premium</span>
                    <span>{insAmt > 0 ? `₹${insAmt.toLocaleString('en-IN')}` : '—'}</span>
                  </div>
                  <div className="flex justify-between text-sm text-stone-500">
                    <span>RSA Premium</span>
                    <span>{rsaAmt > 0 ? `₹${rsaAmt.toLocaleString('en-IN')}` : '—'}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t border-stone-200 pt-2 text-sm">
                    <span>Total</span>
                    <span>{totalAmt > 0 ? `₹${totalAmt.toLocaleString('en-IN')}` : '—'}</span>
                  </div>
                </div>

                {/* Payment method — required */}
                <div>
                  <label className="block text-xs font-semibold tracking-wider uppercase text-stone-500 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={form.payment_method}
                    onChange={e => update('payment_method', e.target.value)}
                    className={`w-full px-4 py-3 bg-stone-50 border text-sm rounded-lg focus:outline-none focus:bg-white transition-colors appearance-none ${
                      errors.payment_method
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-stone-200 focus:border-slate-900'
                    }`}
                  >
                    <option value="">Select payment method</option>
                    {PAYMENT_METHODS.map(m => (
                      <option key={m} value={m}>{PAYMENT_LABELS[m]}</option>
                    ))}
                  </select>
                  {errors.payment_method && (
                    <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.payment_method}</p>
                  )}
                </div>

                {/* Payment reference — optional */}
                <Field
                  label="Txn / Cheque / Ref no — optional"
                  value={form.payment_reference}
                  onChange={v => update('payment_reference', v)}
                  placeholder="e.g. UPI ref no, cheque no, bank ref…"
                  error={errors.payment_reference}
                />

              </div>
            )}
          </div>
        )}

        {/* ── Navigation buttons ───────────────────────────────────────────── */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button
              onClick={handleBack}
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg border border-stone-300 text-sm font-semibold hover:bg-white transition-colors disabled:opacity-50"
            >
              Back
            </button>
          )}
          <button
            onClick={handleContinue}
            disabled={submitting || (step === 3 && tiers !== null && tiers.length === 0)}
            className="ml-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting
              ? 'Submitting…'
              : step < 3
                ? 'Continue'
                : 'Generate certificate'}
            {!submitting && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
