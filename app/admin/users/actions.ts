'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// ─── admin guard ───────────────────────────────────────────────────────────────

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

// ─── generateTempPassword ─────────────────────────────────────────────────────

function generateTempPassword(): string {
  // Omits visually ambiguous chars (I, l, O, 0, 1) so the password is readable at a glance
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  const arr = new Uint8Array(14);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => charset[b % charset.length]).join('');
}

// ─── createUser ───────────────────────────────────────────────────────────────

export type CreateUserInput = {
  email: string;
  full_name: string;
  role: 'admin' | 'dealer';
  location?: string;
};

export type CreateUserResult =
  | { ok: true; tempPassword: string }
  | { ok: false; error: string };

export async function createUser(input: CreateUserInput): Promise<CreateUserResult> {
  const { supabase, adminError } = await requireAdmin();
  if (adminError) return { ok: false, error: adminError };

  const tempPassword = generateTempPassword();

  const { data, error: fnErr } = await supabase!.functions.invoke('create-user', {
    body: {
      email:      input.email.trim().toLowerCase(),
      password:   tempPassword,
      full_name:  input.full_name.trim(),
      role:       input.role,
    },
  });

  if (fnErr) {
    // The Edge Function may include a message in the body even on non-2xx
    const detail = (data as { error?: string } | null)?.error;
    return { ok: false, error: detail ?? fnErr.message };
  }

  if (!data?.ok) {
    return { ok: false, error: data?.error ?? 'Failed to create user' };
  }

  // The handle_new_user trigger already inserted the public.users row.
  // Update location if provided (trigger doesn't set it).
  if (input.location?.trim()) {
    await supabase!
      .from('users')
      .update({ location: input.location.trim() })
      .eq('id', data.user_id);
  }

  revalidatePath('/admin/users');
  return { ok: true, tempPassword };
}

// ─── updateUser ───────────────────────────────────────────────────────────────

export type UpdateUserInput = {
  id: string;
  full_name: string;
  role: 'admin' | 'dealer';
  location?: string;
};

export type UpdateUserResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateUser(input: UpdateUserInput): Promise<UpdateUserResult> {
  const { supabase, adminError } = await requireAdmin();
  if (adminError) return { ok: false, error: adminError };

  const { error } = await supabase!
    .from('users')
    .update({
      full_name: input.full_name.trim(),
      role:      input.role,
      location:  input.location?.trim() || null,
    })
    .eq('id', input.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/users');
  return { ok: true };
}
