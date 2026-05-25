'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// ─── admin guard (mirrors app/admin/layout.tsx pattern) ───────────────────────

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

// ─── addPriceTier ─────────────────────────────────────────────────────────────

export async function addPriceTier(
  userId: string,
  amount: number,
): Promise<{ error: string } | void> {
  const { supabase, adminError } = await requireAdmin();
  if (adminError) return { error: adminError };

  if (!Number.isInteger(amount) || amount < 500 || amount > 5000) {
    return { error: 'Amount must be between ₹500 and ₹5,000' };
  }

  const { error } = await supabase!
    .from('price_tiers')
    .insert({ user_id: userId, amount, is_default: false });

  if (error) {
    if (error.code === '23505') return { error: 'This amount already exists for this dealer' };
    return { error: error.message };
  }

  revalidatePath('/admin/pricing');
}

// ─── removePriceTier ──────────────────────────────────────────────────────────

export async function removePriceTier(
  userId: string,
  amount: number,
): Promise<{ error: string } | void> {
  const { supabase, adminError } = await requireAdmin();
  if (adminError) return { error: adminError };

  const { error } = await supabase!
    .from('price_tiers')
    .delete()
    .eq('user_id', userId)
    .eq('amount', amount);

  if (error) return { error: error.message };

  revalidatePath('/admin/pricing');
}

// ─── setDefaultPriceTier ──────────────────────────────────────────────────────

export async function setDefaultPriceTier(
  dealerId: string,
  amount: number,
): Promise<{ error: string } | void> {
  const { supabase, adminError } = await requireAdmin();
  if (adminError) return { error: adminError };

  const { error: e1 } = await supabase!
    .from('price_tiers')
    .update({ is_default: false })
    .eq('user_id', dealerId);

  if (e1) return { error: e1.message };

  const { error: e2 } = await supabase!
    .from('price_tiers')
    .update({ is_default: true })
    .eq('user_id', dealerId)
    .eq('amount', amount);

  if (e2) return { error: e2.message };

  revalidatePath('/admin/pricing');
}

// ─── unsetDefaultPriceTier ────────────────────────────────────────────────────

export async function unsetDefaultPriceTier(
  dealerId: string,
): Promise<{ error: string } | void> {
  const { supabase, adminError } = await requireAdmin();
  if (adminError) return { error: adminError };

  const { error } = await supabase!
    .from('price_tiers')
    .update({ is_default: false })
    .eq('user_id', dealerId);

  if (error) return { error: error.message };

  revalidatePath('/admin/pricing');
}
