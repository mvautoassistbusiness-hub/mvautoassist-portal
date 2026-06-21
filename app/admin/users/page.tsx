import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import NewUserButton from '@/components/admin/NewUserButton';
import UsersTable, { type UserForTable } from '@/components/admin/UsersTable';

export const metadata: Metadata = {
  title: 'Users · MVAutoAssist Admin',
};

// ─── types ────────────────────────────────────────────────────────────────────

type HelplineRow = {
  user_id: string | null;
  helpline_number: string;
};

type ApprovalSettingRow = {
  user_id: string | null;
  daily_limit: number;
  is_default: boolean;
};

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function UsersPage() {
  const supabase = await createClient();

  const [
    { data: rawUsers, error: e1 },
    { data: certRows, error: e2 },
    { data: tierRows, error: e3 },
    { data: helplineRows, error: e4 },
    { data: globalDefaultRow },
    { data: approvalRows },
    { data: rawShowrooms, error: e5 },
  ] = await Promise.all([
    supabase
      .from('users')
      .select('id, email, full_name, role, location, created_at, must_change_password, showroom_id')
      .order('created_at', { ascending: true }),

    supabase
      .from('certificates')
      .select('agent_id'),

    supabase
      .from('price_tiers')
      .select('user_id, amount')
      .order('amount', { ascending: true }),

    supabase
      .from('helpline_settings')
      .select('user_id, helpline_number')
      .not('user_id', 'is', null),

    supabase
      .from('helpline_settings')
      .select('helpline_number')
      .eq('is_default', true)
      .maybeSingle(),

    supabase
      .from('approval_settings')
      .select('user_id, daily_limit, is_default'),

    supabase
      .from('showrooms')
      .select('id, name')
      .order('name', { ascending: true }),
  ]);

  if (e1) console.error('[UsersPage] users:', e1);
  if (e2) console.error('[UsersPage] certs:', e2);
  if (e3) console.error('[UsersPage] tiers:', e3);
  if (e4) console.error('[UsersPage] helplines:', e4);
  if (e5) console.error('[UsersPage] showrooms:', e5);

  // Build lookup maps
  const certCount = new Map<string, number>();
  (certRows ?? []).forEach(c => {
    if (c.agent_id) certCount.set(c.agent_id, (certCount.get(c.agent_id) ?? 0) + 1);
  });

  const userTiers = new Map<string, number[]>();
  (tierRows ?? []).forEach(t => {
    const existing = userTiers.get(t.user_id);
    if (existing) existing.push(t.amount);
    else userTiers.set(t.user_id, [t.amount]);
  });

  const helplineMap = new Map<string, string>();
  ((helplineRows ?? []) as HelplineRow[]).forEach(h => {
    if (h.user_id) helplineMap.set(h.user_id, h.helpline_number);
  });

  const globalHelpline = (globalDefaultRow as HelplineRow | null)?.helpline_number ?? '9307187878';

  let globalDailyLimit = 10;
  const limitMap = new Map<string, number>();
  ((approvalRows ?? []) as ApprovalSettingRow[]).forEach(r => {
    if (r.user_id === null && r.is_default) {
      globalDailyLimit = r.daily_limit;
    } else if (r.user_id) {
      limitMap.set(r.user_id, r.daily_limit);
    }
  });

  // Showroom lookup
  const showroomMap = new Map<string, { id: string; name: string }>();
  (rawShowrooms ?? []).forEach(s => showroomMap.set(s.id, { id: s.id, name: s.name }));
  const showrooms = (rawShowrooms ?? []).map(s => ({ id: s.id as string, name: s.name as string }));

  const users: UserForTable[] = ((rawUsers ?? []) as (Record<string, unknown>)[]).map(u => ({
    id:        u.id as string,
    email:     u.email as string,
    full_name: u.full_name as string,
    role:      u.role as string,
    location:  u.location as string | null,
    showroom:  u.showroom_id ? showroomMap.get(u.showroom_id as string) ?? null : null,
    certCount: certCount.get(u.id as string) ?? 0,
    prices:    userTiers.get(u.id as string) ?? [],
    helpline:  helplineMap.get(u.id as string) ?? null,
    dailyLimit: limitMap.get(u.id as string) ?? null,
    must_change_password: u.must_change_password as boolean,
  }));

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 lg:px-10 py-5 border-b border-stone-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="lg:hidden w-9 shrink-0" />
          <div>
            <h1
              style={{ fontFamily: "'Instrument Serif', serif" }}
              className="text-3xl tracking-tight leading-none"
            >
              Users &amp; Roles
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              Manage dealers, agents, and their permissions
            </p>
          </div>
        </div>
        <NewUserButton />
      </div>

      <div className="p-6 lg:p-10">
        <UsersTable
          users={users}
          showrooms={showrooms}
          globalHelpline={globalHelpline}
          globalDailyLimit={globalDailyLimit}
        />
      </div>
    </>
  );
}
