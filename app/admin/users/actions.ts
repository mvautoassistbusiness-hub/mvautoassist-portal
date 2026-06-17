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

// ─── setDealerHelpline ────────────────────────────────────────────────────────

export type SetDealerHelplineResult =
  | { ok: true }
  | { ok: false; error: string };

export async function setDealerHelpline(
  userId: string,
  rawNumber: string,
): Promise<SetDealerHelplineResult> {
  const { supabase, adminError } = await requireAdmin();
  if (adminError) return { ok: false, error: adminError };

  const trimmed = rawNumber.trim();

  // Empty → remove override so dealer falls back to global default
  if (!trimmed) {
    const { error } = await supabase!
      .from('helpline_settings')
      .delete()
      .eq('user_id', userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/users');
    return { ok: true };
  }

  // Validate: 7–15 digits (allows spaces, hyphens, +, parens around country code)
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    return { ok: false, error: 'Enter a valid phone number (7–15 digits)' };
  }

  // Delete any existing override then insert fresh (avoids partial-index upsert
  // inference ambiguity; admin-only action so the two-step is safe here)
  await supabase!
    .from('helpline_settings')
    .delete()
    .eq('user_id', userId);

  const { error } = await supabase!
    .from('helpline_settings')
    .insert({ user_id: userId, helpline_number: trimmed, is_default: false });

  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/users');
  return { ok: true };
}

// ─── setDealerApprovalLimit ───────────────────────────────────────────────────

export type SetDealerApprovalLimitResult =
  | { ok: true }
  | { ok: false; error: string };

export async function setDealerApprovalLimit(
  userId: string,
  rawLimit: string,
): Promise<SetDealerApprovalLimitResult> {
  const { supabase, adminError } = await requireAdmin();
  if (adminError) return { ok: false, error: adminError };

  const trimmed = rawLimit.trim();

  // Empty → remove per-dealer override (falls back to global default)
  if (!trimmed) {
    const { error } = await supabase!
      .from('approval_settings')
      .delete()
      .eq('user_id', userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/users');
    return { ok: true };
  }

  const limit = parseInt(trimmed, 10);
  if (isNaN(limit) || limit < 0 || String(limit) !== trimmed) {
    return { ok: false, error: 'Daily limit must be a non-negative whole number' };
  }

  // Delete any existing override, then insert fresh (mirrors setDealerHelpline)
  await supabase!.from('approval_settings').delete().eq('user_id', userId);
  const { error } = await supabase!
    .from('approval_settings')
    .insert({ user_id: userId, daily_limit: limit, is_default: false });

  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/users');
  return { ok: true };
}

// ─── resetDealerPassword ──────────────────────────────────────────────────────

export type ResetDealerPasswordResult =
  | { ok: true; tempPassword: string }
  | { ok: false; error: string };

export async function resetDealerPassword(
  userId: string,
): Promise<ResetDealerPasswordResult> {
  const { adminError } = await requireAdmin();
  if (adminError) return { ok: false, error: adminError };

  const admin = createAdminClient();

  // Only reset passwords for dealers (admins use real email resets)
  const { data: profile } = await admin
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  if (!profile || profile.role !== 'dealer') {
    return { ok: false, error: 'Password reset is only available for dealer accounts' };
  }

  const tempPassword = generateTempPassword();

  const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
    password: tempPassword,
  });
  if (authErr) return { ok: false, error: authErr.message };

  // Flag dealer to change password on next login
  await admin.from('users').update({ must_change_password: true }).eq('id', userId);

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
