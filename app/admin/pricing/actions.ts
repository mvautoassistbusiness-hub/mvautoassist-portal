'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function addPriceTier(userId: string, amount: number): Promise<void> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('price_tiers')
    .insert({ user_id: userId, amount, is_default: false });

  if (error) throw new Error(error.message);

  revalidatePath('/admin/pricing');
}

export async function removePriceTier(userId: string, amount: number): Promise<void> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('price_tiers')
    .delete()
    .eq('user_id', userId)
    .eq('amount', amount);

  if (error) throw new Error(error.message);

  revalidatePath('/admin/pricing');
}

export async function setDefaultPriceTier(
  dealerId: string,
  amount: number,
): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error: e1 } = await supabase
    .from('price_tiers')
    .update({ is_default: false })
    .eq('user_id', dealerId);

  if (e1) return { error: e1.message };

  const { error: e2 } = await supabase
    .from('price_tiers')
    .update({ is_default: true })
    .eq('user_id', dealerId)
    .eq('amount', amount);

  if (e2) return { error: e2.message };

  revalidatePath('/admin/pricing');
}

export async function unsetDefaultPriceTier(
  dealerId: string,
): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('price_tiers')
    .update({ is_default: false })
    .eq('user_id', dealerId);

  if (error) return { error: error.message };

  revalidatePath('/admin/pricing');
}
