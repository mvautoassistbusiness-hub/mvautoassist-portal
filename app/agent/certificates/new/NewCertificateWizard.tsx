'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Bike, Car } from 'lucide-react';
import Field from '@/components/agent/Field';

// ─── form state ───────────────────────────────────────────────────────────────
// All DB column names used verbatim. Step 3 fields are stubs — they have
// sensible defaults now so the type is stable across phases.

type FormState = {
  // Step 1 — customer details
  customer_name:    string;
  customer_dob:     string;   // YYYY-MM-DD
  customer_mobile:  string;
  customer_email:   string;
  customer_address: string;
  // Step 2 — vehicle info
  vehicle_type:       string;
  registration_no:    string;
  make_model:         string;
  variant:            string;
  engine_no:          string;
  chassis_no:         string;
  fuel_type:          string;
  manufacturing_year: string;
  // Step 3 — pricing (populated in Phase 5)
  start_date:        string;
  end_date:          string;
  insurance_amount:  string;
  rsa_amount:        string;
};

type Errors = Partial<Record<keyof FormState, string>>;

const INITIAL: FormState = {
  customer_name: '', customer_dob: '', customer_mobile: '',
  customer_email: '', customer_address: '',
  vehicle_type: 'Two Wheeler', registration_no: '', make_model: '',
  variant: '', engine_no: '', chassis_no: '', fuel_type: 'Petrol',
  manufacturing_year: '',
  start_date: '', end_date: '', insurance_amount: '', rsa_amount: '',
};

const VEHICLE_TYPES = ['Two Wheeler', 'Four Wheeler'] as const;
const FUEL_TYPES    = ['Petrol', 'Diesel', 'Electric', 'CNG'] as const;

// ─── validation ───────────────────────────────────────────────────────────────

function validateStep1(f: FormState): Errors {
  const e: Errors = {};
  if (!f.customer_name.trim() || f.customer_name.trim().length < 2)
    e.customer_name = 'Name is required';
  if (!/^\d{10}$/.test(f.customer_mobile))
    e.customer_mobile = 'Enter a valid 10-digit mobile';
  return e;
}

function validateStep2(f: FormState): Errors {
  const e: Errors = {};
  const currentYear = new Date().getFullYear();

  if (!(VEHICLE_TYPES as readonly string[]).includes(f.vehicle_type))
    e.vehicle_type = 'Select a vehicle type';

  if (!f.make_model.trim() || f.make_model.trim().length < 2)
    e.make_model = 'Vehicle make and model required';

  const yr = parseInt(f.manufacturing_year, 10);
  if (!f.manufacturing_year || isNaN(yr) || yr < 1990 || yr > currentYear)
    e.manufacturing_year = `Enter a valid manufacturing year (1990–${currentYear})`;

  if (!f.engine_no.trim() || f.engine_no.trim().length < 3)
    e.engine_no = 'Engine number required';

  // chassis_no is required — Vilas rule 3 (search includes chassis_no)
  if (!f.chassis_no.trim() || f.chassis_no.trim().length < 3)
    e.chassis_no = 'Chassis number required';

  if (!(FUEL_TYPES as readonly string[]).includes(f.fuel_type))
    e.fuel_type = 'Select a fuel type';

  return e;
}

// ─── wizard ───────────────────────────────────────────────────────────────────

export default function NewCertificateWizard() {
  const [step,   setStep]   = useState(1);
  const [form,   setForm]   = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});

  function update<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }));
  }

  function handleContinue() {
    if (step === 1) {
      const errs = validateStep1(form);
      if (Object.keys(errs).length) { setErrors(errs); return; }
    }
    if (step === 2) {
      const errs = validateStep2(form);
      if (Object.keys(errs).length) { setErrors(errs); return; }
    }
    setErrors({});
    setStep(s => Math.min(s + 1, 3));
  }

  function handleBack() {
    setErrors({});
    setStep(s => Math.max(s - 1, 1));
  }

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
                <Field
                  label="Date of birth"
                  type="date"
                  value={form.customer_dob}
                  onChange={v => update('customer_dob', v)}
                />
                <Field
                  label="Mobile number"
                  value={form.customer_mobile}
                  onChange={v => update('customer_mobile', v)}
                  placeholder="10-digit mobile number"
                  error={errors.customer_mobile}
                />
              </div>
              <Field
                label="Email (optional)"
                type="email"
                value={form.customer_email}
                onChange={v => update('customer_email', v)}
                placeholder="customer@example.com"
              />
              <Field
                label="Address (optional)"
                value={form.customer_address}
                onChange={v => update('customer_address', v)}
                placeholder="Full postal address"
                textarea
              />
            </div>
          </div>
        )}

        {/* ── Step 2: Vehicle information ──────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 style={{ fontFamily: "'Instrument Serif', serif" }} className="text-2xl mb-1">
                Vehicle information
              </h2>
              <p className="text-sm text-stone-500">Details of the vehicle being insured</p>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">

              {/* Vehicle type — large toggle buttons */}
              <div>
                <label className="block text-xs font-semibold tracking-wider uppercase text-stone-500 mb-2">
                  Vehicle type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {VEHICLE_TYPES.map(vt => (
                    <button
                      key={vt}
                      type="button"
                      onClick={() => update('vehicle_type', vt)}
                      className={`p-4 rounded-lg border-2 flex items-center gap-3 transition-all ${
                        form.vehicle_type === vt
                          ? 'border-slate-900 bg-stone-50'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      {vt === 'Two Wheeler'
                        ? <Bike className="w-5 h-5" />
                        : <Car  className="w-5 h-5" />}
                      <span className="font-semibold text-sm">{vt}</span>
                    </button>
                  ))}
                </div>
                {errors.vehicle_type && (
                  <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.vehicle_type}</p>
                )}
              </div>

              {/* Registration no + Make & Model */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Registration no"
                  value={form.registration_no}
                  onChange={v => update('registration_no', v)}
                  placeholder="MH09 AB 1234 or 'New'"
                />
                <Field
                  label="Make & Model"
                  value={form.make_model}
                  onChange={v => update('make_model', v)}
                  placeholder="HONDA CB350RS"
                  error={errors.make_model}
                />
              </div>

              {/* Variant + Manufacturing year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Variant"
                  value={form.variant}
                  onChange={v => update('variant', v)}
                  placeholder="DLX PRO DUAL TONE"
                />
                <Field
                  label="Manufacturing year"
                  value={form.manufacturing_year}
                  onChange={v => update('manufacturing_year', v)}
                  placeholder="2025"
                  error={errors.manufacturing_year}
                />
              </div>

              {/* Engine no + Chassis no (both required) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Engine no"
                  value={form.engine_no}
                  onChange={v => update('engine_no', v)}
                  placeholder="NC58EA3025933"
                  error={errors.engine_no}
                />
                <Field
                  label="Chassis no"
                  value={form.chassis_no}
                  onChange={v => update('chassis_no', v)}
                  placeholder="ME4NC681JSA006238"
                  error={errors.chassis_no}
                />
              </div>

              {/* Fuel type — pill row */}
              <div>
                <label className="block text-xs font-semibold tracking-wider uppercase text-stone-500 mb-2">
                  Fuel type
                </label>
                <div className="flex gap-2 flex-wrap">
                  {FUEL_TYPES.map(ft => (
                    <button
                      key={ft}
                      type="button"
                      onClick={() => update('fuel_type', ft)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        form.fuel_type === ft
                          ? 'bg-slate-900 text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {ft}
                    </button>
                  ))}
                </div>
                {errors.fuel_type && (
                  <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.fuel_type}</p>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ── Step 3: Plan & pricing placeholder (Phase 5) ─────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 style={{ fontFamily: "'Instrument Serif', serif" }} className="text-2xl mb-1">
                Plan &amp; pricing
              </h2>
              <p className="text-sm text-stone-500">Select coverage period and premium</p>
            </div>
            <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center text-stone-400 text-sm">
              Step 3 — Plan &amp; pricing coming in Phase 5
            </div>
          </div>
        )}

        {/* ── Navigation buttons ───────────────────────────────────────────── */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="px-5 py-2.5 rounded-lg border border-stone-300 text-sm font-semibold hover:bg-white transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={handleContinue}
            className="ml-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            {step < 3 ? 'Continue' : 'Generate certificate'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
