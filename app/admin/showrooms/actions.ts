'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// Join-code charset: uppercase letters + digits, no ambiguous chars (0/O/1/I/L)
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LEN = 7;

function generateCode(): string {
  return Array.from({ length: CODE_LEN }, () =>
    CHARSET[Math.floor(Math.random() * CHARSET.length)]
  ).join('');
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, ok: false as const };

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') return { supabase, user: null, ok: false as const };
  return { supabase, ok: true as const };
}

export type CreateShowroomResult =
  | { ok: true;  showroom: { id: string; name: string; join_code: string } }
  | { ok: false; error: string };

export async function createShowroom(name: string): Promise<CreateShowroomResult> {
  const { supabase, ok } = await requireAdmin();
  if (!ok) return { ok: false, error: 'Forbidden' };

  const trimmedName = name.trim();
  if (!trimmedName || trimmedName.length < 2)
    return { ok: false, error: 'Showroom name must be at least 2 characters.' };

  // Generate a unique join code (collision is astronomically unlikely but handle it)
  let join_code = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateCode();
    const { data: existing } = await supabase
      .from('showrooms')
      .select('id')
      .eq('join_code', candidate)
      .maybeSingle();

    if (!existing) { join_code = candidate; break; }
  }

  if (!join_code)
    return { ok: false, error: 'Could not generate a unique code. Please try again.' };

  const { data: showroom, error } = await supabase
    .from('showrooms')
    .insert({ name: trimmedName, join_code })
    .select('id, name, join_code')
    .single();

  if (error || !showroom) return { ok: false, error: error?.message ?? 'Insert failed.' };

  revalidatePath('/admin/showrooms');
  return { ok: true, showroom };
}
