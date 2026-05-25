import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_ROLES = ['admin', 'dealer'] as const;
type AllowedRole = typeof ALLOWED_ROLES[number];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey     = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // ── 1. Verify caller holds a valid session and is admin ──────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ ok: false, error: 'Missing authorization' }, 401);

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user: caller }, error: authErr } = await callerClient.auth.getUser();
  if (authErr || !caller) return json({ ok: false, error: 'Unauthorized' }, 401);

  const { data: callerProfile } = await callerClient
    .from('users')
    .select('role')
    .eq('id', caller.id)
    .single();

  if (callerProfile?.role !== 'admin') return json({ ok: false, error: 'Forbidden' }, 403);

  // ── 2. Parse and validate request body ──────────────────────────────────────
  let email: string, password: string, full_name: string, role: AllowedRole;
  try {
    const body = await req.json();
    email     = body.email;
    password  = body.password;
    full_name = body.full_name;
    role      = body.role;
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  if (!email || typeof email !== 'string' || !email.includes('@'))
    return json({ ok: false, error: 'Invalid email address' }, 400);
  if (!password || typeof password !== 'string' || password.length < 8)
    return json({ ok: false, error: 'Password must be at least 8 characters' }, 400);
  if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2)
    return json({ ok: false, error: 'Full name must be at least 2 characters' }, 400);
  if (!ALLOWED_ROLES.includes(role as AllowedRole))
    return json({ ok: false, error: 'Role must be admin or dealer' }, 400);

  // ── 3. Create user — service role only reached after admin check above ───────
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name.trim(), role },
  });

  if (createErr || !created?.user) {
    return json({ ok: false, error: createErr?.message ?? 'Failed to create user' }, 400);
  }

  return json({ ok: true, user_id: created.user.id });
});
