'use server';

import { createClient } from '@supabase/supabase-js';

export type RegisterResult =
  | { ok: true;  username: string; showroomName: string }
  | { ok: false; error: string };

// ── Slug helpers ──────────────────────────────────────────────────────────────

/** firstname: first word of full_name, lowercase, only a-z */
function toFirstname(fullName: string): string {
  return fullName.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, '');
}

/** showroomslug: lowercase, any non-alnum run → single underscore, strip edges */
function toSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// ── Service-role admin client (server-side only) ───────────────────────────────
// SUPABASE_SERVICE_ROLE_KEY is never exported to the client (no NEXT_PUBLIC_ prefix).
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// ── Main registration action ───────────────────────────────────────────────────

export async function registerDealer(input: {
  full_name:        string;
  join_code:        string;
  password:         string;
  confirm_password: string;
}): Promise<RegisterResult> {
  // ── Input validation ──────────────────────────────────────────────────────
  const full_name = input.full_name.trim();
  const join_code = input.join_code.trim().toUpperCase();
  const { password, confirm_password } = input;

  if (!full_name || full_name.length < 2)
    return { ok: false, error: 'Full name must be at least 2 characters.' };
  if (!join_code)
    return { ok: false, error: 'Showroom join code is required.' };
  if (!password || password.length < 8)
    return { ok: false, error: 'Password must be at least 8 characters.' };
  if (password !== confirm_password)
    return { ok: false, error: 'Passwords do not match.' };

  const admin = adminClient();

  // ── 1. Resolve showroom from join_code (server-side only) ────────────────
  const { data: showroom, error: showroomErr } = await admin
    .from('showrooms')
    .select('id, name')
    .eq('join_code', join_code)
    .single();

  if (showroomErr || !showroom)
    return { ok: false, error: 'Invalid showroom code. Please check with your manager.' };

  // ── 2. Derive a unique username ───────────────────────────────────────────
  const firstname    = toFirstname(full_name) || 'dealer';
  const showroomslug = toSlug(showroom.name)  || 'showroom';
  const base         = `${firstname}_${showroomslug}`;

  let username = base;
  for (let attempt = 1; attempt <= 10; attempt++) {
    const { data: taken } = await admin
      .from('users')
      .select('id')
      .eq('email', `${username}@mvautoassist.in`)
      .maybeSingle();

    if (!taken) break;
    username = `${base}${attempt}`;
  }

  const syntheticEmail = `${username}@mvautoassist.in`;

  // ── 3. Create auth user — role is HARD-CODED 'dealer', never from input ───
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email:         syntheticEmail,
    password,
    email_confirm: true,
    user_metadata: {
      full_name,
      role: 'dealer',   // ← never read from client input
    },
  });

  if (createErr || !created?.user)
    return { ok: false, error: createErr?.message ?? 'Registration failed. Please try again.' };

  // ── 4. Set showroom_id — server-side from validated code, never from client ─
  const { error: updateErr } = await admin
    .from('users')
    .update({ showroom_id: showroom.id })
    .eq('id', created.user.id);

  if (updateErr) {
    // Roll back auth user so the account isn't orphaned
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: 'Failed to link showroom. Please try again.' };
  }

  return { ok: true, username, showroomName: showroom.name };
}
