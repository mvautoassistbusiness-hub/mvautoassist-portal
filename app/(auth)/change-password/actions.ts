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

// Called after the dealer successfully sets a new password via auth.updateUser.
// Clears the must_change_password flag using service role so RLS doesn't block it.
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
