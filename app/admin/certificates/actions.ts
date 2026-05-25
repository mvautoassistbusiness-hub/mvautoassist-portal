'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// ─── admin guard (mirrors app/admin/pricing/actions.ts pattern) ───────────────

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, adminError: 'Unauthorized' as const };

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return { supabase: null, adminError: 'Unauthorized' as const };
  }

  return { supabase, adminError: null };
}

// ─── approveCertificate ───────────────────────────────────────────────────────

export async function approveCertificate(certId: string): Promise<void> {
  const { supabase, adminError } = await requireAdmin();
  if (adminError) throw new Error(adminError);

  const { data: { user } } = await supabase!.auth.getUser();

  const { error } = await supabase!
    .from('certificates')
    .update({
      status:      'approved',
      approved_at: new Date().toISOString(),
      approved_by: user!.id,
    })
    .eq('id', certId)
    .eq('status', 'pending');

  if (error) throw new Error(error.message);

  revalidatePath('/admin/certificates');
  revalidatePath('/admin/dashboard');
}

// ─── rejectCertificate ────────────────────────────────────────────────────────

export async function rejectCertificate(certId: string): Promise<void> {
  const { supabase, adminError } = await requireAdmin();
  if (adminError) throw new Error(adminError);

  const { data: { user } } = await supabase!.auth.getUser();

  const { error } = await supabase!
    .from('certificates')
    .update({
      status:      'rejected',
      approved_at: new Date().toISOString(),
      approved_by: user!.id,
    })
    .eq('id', certId)
    .eq('status', 'pending');

  if (error) throw new Error(error.message);

  revalidatePath('/admin/certificates');
  revalidatePath('/admin/dashboard');
}

// ─── confirmPaymentReceived ───────────────────────────────────────────────────

export async function confirmPaymentReceived(
  certId: string,
  received: boolean,
): Promise<void> {
  const { supabase, adminError } = await requireAdmin();
  if (adminError) throw new Error(adminError);

  const { error } = await supabase!
    .from('certificates')
    .update({ payment_received: received })
    .eq('id', certId);

  if (error) throw new Error(error.message);

  revalidatePath('/admin/certificates');
}
