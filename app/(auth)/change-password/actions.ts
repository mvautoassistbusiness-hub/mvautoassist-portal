'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createSBClient } from '@supabase/supabase-js';

function createAdminClient() {
  return createSBClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// Changes the dealer's own password and clears must_change_password in one
// server-side round-trip. Uses supabase.auth.updateUser so the session tokens
// are refreshed in the response cookies — the dealer stays logged in and
// router.push('/agent/certificates') works immediately after.
export async function changePassword(newPassword: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  if (!newPassword || newPassword.length < 8)
    return { ok: false, error: 'Password must be at least 8 characters.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated.' };

  // auth.updateUser runs server-side; new session tokens written to response cookies.
  const { error: pwdErr } = await supabase.auth.updateUser({ password: newPassword });
  if (pwdErr) return { ok: false, error: pwdErr.message };

  const { error: flagErr } = await createAdminClient()
    .from('users')
    .update({ must_change_password: false })
    .eq('id', user.id);
  if (flagErr) return { ok: false, error: flagErr.message };

  return { ok: true };
}

// Kept for any callers that only need to clear the flag (not change password).
export async function clearMustChangePassword(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { error } = await createAdminClient()
    .from('users')
    .update({ must_change_password: false })
    .eq('id', user.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
