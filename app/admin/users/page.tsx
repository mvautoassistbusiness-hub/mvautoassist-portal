import type { Metadata } from 'next';
import { MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import NewUserButton from '@/components/admin/NewUserButton';
import EditUserButton from '@/components/admin/EditUserButton';
import ResetPasswordButton from '@/components/admin/ResetPasswordButton';

export const metadata: Metadata = {
  title: 'Users · MVAutoAssist Admin',
};

// ─── types ────────────────────────────────────────────────────────────────────

type UserRow = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  location: string | null;
  created_at: string;
  must_change_password: boolean;
};

type HelplineRow = {
  user_id: string | null;
  helpline_number: string;
};

type ApprovalSettingRow = {
  user_id: string | null;
  daily_limit: number;
  is_default: boolean;
};

// ─── helper ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function UsersPage() {
  const supabase = await createClient();

  // Six parallel queries — join in JS to avoid complex PostgREST hints
  const [
    { data: rawUsers, error: e1 },
    { data: certRows, error: e2 },
    { data: tierRows, error: e3 },
    { data: helplineRows, error: e4 },
    { data: globalDefaultRow },
    { data: approvalRows },
  ] = await Promise.all([
    supabase
      .from('users')
      .select('id, email, full_name, role, location, created_at, must_change_password')
      .order('created_at', { ascending: true }),

    // Only need agent_id to count certificates per user
    supabase
      .from('certificates')
      .select('agent_id'),

    // Price tiers ordered so chips render lowest→highest
    supabase
      .from('price_tiers')
      .select('user_id, amount')
      .order('amount', { ascending: true }),

    // Per-dealer helpline overrides (user_id IS NOT NULL)
    supabase
      .from('helpline_settings')
      .select('user_id, helpline_number')
      .not('user_id', 'is', null),

    // Global default helpline number for placeholder text
    supabase
      .from('helpline_settings')
      .select('helpline_number')
      .eq('is_default', true)
      .maybeSingle(),

    // All approval_settings (global default + per-dealer overrides)
    supabase
      .from('approval_settings')
      .select('user_id, daily_limit, is_default'),
  ]);

  if (e1) console.error('[UsersPage] users:', e1);
  if (e2) console.error('[UsersPage] certs:', e2);
  if (e3) console.error('[UsersPage] tiers:', e3);
  if (e4) console.error('[UsersPage] helplines:', e4);

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

  // Build approval limit maps
  const limitMap = new Map<string, number>();
  let globalDailyLimit = 10;
  ((approvalRows ?? []) as ApprovalSettingRow[]).forEach(r => {
    if (r.user_id === null && r.is_default) {
      globalDailyLimit = r.daily_limit;
    } else if (r.user_id) {
      limitMap.set(r.user_id, r.daily_limit);
    }
  });

  const users = (rawUsers ?? []) as UserRow[];

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
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          {users.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-stone-400">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr className="text-left text-xs uppercase tracking-wider text-stone-500">
                    <th className="px-6 py-3 font-semibold">User</th>
                    <th className="px-6 py-3 font-semibold hidden sm:table-cell">Role</th>
                    <th className="px-6 py-3 font-semibold hidden md:table-cell">Location</th>
                    <th className="px-6 py-3 font-semibold">Certificates</th>
                    <th className="px-6 py-3 font-semibold hidden lg:table-cell">Allowed Prices</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {users.map(u => {
                    const prices = userTiers.get(u.id) ?? [];
                    const count  = certCount.get(u.id) ?? 0;

                    return (
                      <tr key={u.id} className="hover:bg-stone-50 transition-colors">

                        {/* User — avatar + name + email */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-red-500 flex items-center justify-center font-bold text-white text-xs shrink-0">
                              {initials(u.full_name)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{u.full_name}</div>
                              <div
                                className="text-xs text-stone-500 truncate"
                                style={{ fontFamily: "'JetBrains Mono', monospace" }}
                              >
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role badge */}
                        <td className="px-6 py-4 hidden sm:table-cell">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            u.role === 'admin'
                              ? 'bg-slate-900 text-white'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {u.role}
                          </span>
                        </td>

                        {/* Location */}
                        <td className="px-6 py-4 hidden md:table-cell">
                          {u.location ? (
                            <div className="flex items-center gap-1.5 text-sm text-stone-600">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {u.location}
                            </div>
                          ) : (
                            <span className="text-stone-400 text-xs">—</span>
                          )}
                        </td>

                        {/* Certificate count */}
                        <td className="px-6 py-4 font-semibold">{count}</td>

                        {/* Price tier chips */}
                        <td className="px-6 py-4 hidden lg:table-cell">
                          {prices.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {prices.map(p => (
                                <span
                                  key={p}
                                  className="text-xs px-2 py-1 rounded bg-stone-100 font-medium"
                                >
                                  ₹{p.toLocaleString('en-IN')}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-stone-400 text-xs">No prices set</span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {u.role === 'dealer' && (
                              <ResetPasswordButton
                                userId={u.id}
                                userName={u.full_name}
                              />
                            )}
                            <EditUserButton
                              userId={u.id}
                              currentName={u.full_name}
                              currentRole={u.role as 'admin' | 'dealer'}
                              currentLocation={u.location}
                              currentHelpline={helplineMap.get(u.id) ?? null}
                              globalHelpline={globalHelpline}
                              currentDailyLimit={limitMap.get(u.id) ?? null}
                              globalDailyLimit={globalDailyLimit}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
