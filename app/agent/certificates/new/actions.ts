'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSBClient } from '@supabase/supabase-js';

function createAdminClient() {
  return createSBClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// ─── shared form type ─────────────────────────────────────────────────────────
// All fields are strings — matches what the wizard form sends.
// The server action performs type coercion before inserting.

export type CertFormData = {
  customer_name:    string;
  customer_dob:     string;   // YYYY-MM-DD or ''
  customer_mobile:  string;
  customer_email:   string;
  customer_address: string;
  vehicle_type:     string;
  registration_no:  string;
  make_model:       string;
  variant:          string;
  engine_no:        string;
  chassis_no:       string;
  fuel_type:        string;
  manufacturing_year: string;
  start_date:       string;   // YYYY-MM-DD
  end_date:         string;   // YYYY-MM-DD
  insurance_amount: string;   // numeric string
  rsa_amount:       string;   // numeric string
  payment_method:   string;   // one of ALLOWED_PAYMENT_METHODS
  payment_reference: string;  // optional free text
};

// ─── getDealerPriceTiers ──────────────────────────────────────────────────────

export async function getDealerPriceTiers(): Promise<
  { ok: true; tiers: { amount: number; is_default: boolean }[] } | { ok: false; error: string }
> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('price_tiers')
      .select('amount, is_default')
      .eq('user_id', user.id)
      .order('amount', { ascending: true });

    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      tiers: (data ?? []).map(r => ({
        amount: Number(r.amount),
        is_default: Boolean(r.is_default),
      })),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// ─── createCertificate ────────────────────────────────────────────────────────

export async function createCertificate(form: CertFormData): Promise<
  { ok: true; certId: string; certNumber: string } | { ok: false; error: string }
> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Not authenticated' };

    // ── Server-side validation (never trust client) ───────────────────────
    const CURRENT_YEAR = new Date().getFullYear();

    if (!form.customer_name.trim() || form.customer_name.trim().length < 2)
      return { ok: false, error: 'Customer name is required (min 2 characters)' };

    if (!/^\d{10}$/.test(form.customer_mobile))
      return { ok: false, error: 'Valid 10-digit mobile number required' };

    if (!['Two Wheeler', 'Four Wheeler'].includes(form.vehicle_type))
      return { ok: false, error: 'Invalid vehicle type' };

    if (!form.make_model.trim() || form.make_model.trim().length < 2)
      return { ok: false, error: 'Vehicle make and model required' };

    const mfgYear = parseInt(form.manufacturing_year, 10);
    if (!form.manufacturing_year || isNaN(mfgYear) || mfgYear < 1990 || mfgYear > CURRENT_YEAR)
      return { ok: false, error: `Manufacturing year must be between 1990 and ${CURRENT_YEAR}` };

    if (!form.engine_no.trim() || form.engine_no.trim().length < 3)
      return { ok: false, error: 'Engine number required' };

    if (!form.chassis_no.trim() || form.chassis_no.trim().length < 3)
      return { ok: false, error: 'Chassis number required' };

    if (!['Petrol', 'Diesel', 'Electric', 'CNG'].includes(form.fuel_type))
      return { ok: false, error: 'Invalid fuel type' };

    if (!form.start_date)
      return { ok: false, error: 'Start date required' };

    if (!form.end_date)
      return { ok: false, error: 'End date required' };

    if (form.end_date <= form.start_date)
      return { ok: false, error: 'End date must be after start date' };

    const insuranceAmt = parseFloat(form.insurance_amount);
    if (isNaN(insuranceAmt) || insuranceAmt <= 0)
      return { ok: false, error: 'Insurance premium must be a positive number' };

    const rsaAmt = parseFloat(form.rsa_amount);
    if (isNaN(rsaAmt) || rsaAmt <= 0)
      return { ok: false, error: 'RSA premium must be selected' };

    const ALLOWED_PAYMENT_METHODS = ['cash', 'upi', 'card', 'cheque', 'bank_transfer'] as const;
    if (!ALLOWED_PAYMENT_METHODS.includes(form.payment_method as typeof ALLOWED_PAYMENT_METHODS[number]))
      return { ok: false, error: 'Select a valid payment method' };

    // Re-query price_tiers — never trust the client's rsa_amount (Vilas rule 10)
    const { data: tierCheck } = await supabase
      .from('price_tiers')
      .select('amount')
      .eq('user_id', user.id)
      .eq('amount', rsaAmt)
      .limit(1);

    if (!tierCheck || tierCheck.length === 0)
      return { ok: false, error: 'Selected RSA amount is not assigned to your account' };

    const total_amount = insuranceAmt + rsaAmt;

    // ── Dedupe guard: if same dealer + engine + chassis was inserted in the
    //    last 2 minutes, treat it as a duplicate submit (double-click / refresh)
    //    and return the existing cert instead of burning another cert number.
    const { data: recentDup } = await supabase
      .from('certificates')
      .select('id, cert_number')
      .eq('agent_id', user.id)
      .eq('engine_no', form.engine_no.trim())
      .eq('chassis_no', form.chassis_no.trim())
      .neq('status', 'rejected')
      .gte('created_at', new Date(Date.now() - 2 * 60 * 1000).toISOString())
      .limit(1)
      .maybeSingle();

    if (recentDup) {
      revalidatePath('/agent/certificates');
      revalidatePath('/admin/certificates');
      revalidatePath('/admin/dashboard');
      return { ok: true, certId: recentDup.id, certNumber: recentDup.cert_number };
    }

    const { data: certNumber, error: rpcError } = await supabase.rpc('generate_cert_number');
    if (rpcError || !certNumber) {
      return { ok: false, error: 'Failed to generate certificate number' };
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('certificates')
      .insert({
        cert_number:        certNumber,
        agent_id:           user.id,
        status:             'pending',
        customer_name:      form.customer_name.trim(),
        customer_dob:       form.customer_dob || null,
        customer_mobile:    form.customer_mobile,
        customer_email:     form.customer_email.trim() || null,
        customer_address:   form.customer_address.trim() || null,
        vehicle_type:       form.vehicle_type,
        registration_no:    form.registration_no.trim() || null,
        make_model:         form.make_model.trim(),
        variant:            form.variant.trim() || null,
        engine_no:          form.engine_no.trim(),
        chassis_no:         form.chassis_no.trim(),
        fuel_type:          form.fuel_type,
        manufacturing_year: mfgYear,
        start_date:         form.start_date,
        end_date:           form.end_date,
        insurance_amount:   insuranceAmt,
        rsa_amount:         rsaAmt,
        total_amount,
        payment_method:     form.payment_method,
        payment_reference:  form.payment_reference.trim() || null,
        payment_received:   false,
      })
      .select('id, cert_number')
      .single();

    if (insertErr || !inserted) {
      return { ok: false, error: insertErr?.message ?? 'Certificate creation failed' };
    }

    // ── Auto-approval: check IST daily count against dealer's limit ───────────
    // Uses service-role client so status can be set without touching payment.
    try {
      const admin = createAdminClient();

      // IST = UTC+05:30. Compute today's window in UTC.
      const nowMs = Date.now();
      const istNow = new Date(nowMs + 5.5 * 60 * 60 * 1000);
      const todayIST = istNow.toISOString().substring(0, 10); // "YYYY-MM-DD"
      const startUTC = new Date(`${todayIST}T00:00:00.000+05:30`).toISOString();
      const endUTC   = new Date(`${todayIST}T23:59:59.999+05:30`).toISOString();

      // Count certs already issued today (excluding the one just inserted)
      // and fetch the dealer's limit in parallel.
      const [countResult, overrideResult, defaultResult] = await Promise.all([
        supabase
          .from('certificates')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', user.id)
          .gte('created_at', startUTC)
          .lte('created_at', endUTC)
          .neq('id', inserted.id),
        admin
          .from('approval_settings')
          .select('daily_limit')
          .eq('user_id', user.id)
          .maybeSingle(),
        admin
          .from('approval_settings')
          .select('daily_limit')
          .eq('is_default', true)
          .maybeSingle(),
      ]);

      const prevCount  = countResult.count ?? 0;
      const dailyLimit = overrideResult.data?.daily_limit
        ?? defaultResult.data?.daily_limit
        ?? 10;

      if (prevCount < dailyLimit) {
        // This cert is within the limit → auto-approve.
        // Does NOT touch payment_received (it stays false from the INSERT).
        await admin
          .from('certificates')
          .update({ status: 'approved', approved_at: new Date().toISOString() })
          .eq('id', inserted.id);
      }
    } catch {
      // Auto-approval is best-effort. Cert stays pending if anything fails.
    }

    revalidatePath('/agent/certificates');
    revalidatePath('/admin/certificates');
    revalidatePath('/admin/dashboard');
    return { ok: true, certId: inserted.id, certNumber: inserted.cert_number };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unexpected error' };
  }
}
