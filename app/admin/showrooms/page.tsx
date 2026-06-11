import type { Metadata } from 'next';
import { Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import CreateShowroomButton from '@/components/admin/CreateShowroomButton';

export const metadata: Metadata = {
  title: 'Showrooms · MVAutoAssist Admin',
};

export default async function ShowroomsPage() {
  const supabase = await createClient();

  // Admin layout already enforces authentication + role — fetch data directly
  const [{ data: showrooms }, { data: dealers }] = await Promise.all([
    supabase
      .from('showrooms')
      .select('id, name, join_code, created_at')
      .order('created_at', { ascending: true }),
    supabase
      .from('users')
      .select('showroom_id')
      .eq('role', 'dealer')
      .not('showroom_id', 'is', null),
  ]);

  // Build dealer count per showroom
  const dealerCount = new Map<string, number>();
  for (const d of dealers ?? []) {
    if (d.showroom_id)
      dealerCount.set(d.showroom_id, (dealerCount.get(d.showroom_id) ?? 0) + 1);
  }

  const list = showrooms ?? [];

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
              Showrooms
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              {list.length} showroom{list.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <CreateShowroomButton />
      </div>

      <div className="p-6 lg:p-10">
        {list.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-16 text-center">
            <Building2 className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">No showrooms yet</h3>
            <p className="text-sm text-stone-500 mb-5">
              Create a showroom to generate a join code for dealers.
            </p>
            <CreateShowroomButton />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr className="text-left text-xs uppercase tracking-wider text-stone-500">
                  <th className="px-6 py-3 font-semibold">Showroom</th>
                  <th className="px-6 py-3 font-semibold">Join Code</th>
                  <th className="px-6 py-3 font-semibold hidden md:table-cell">Dealers</th>
                  <th className="px-6 py-3 font-semibold hidden lg:table-cell">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {list.map(s => (
                  <tr key={s.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4 font-semibold">{s.name}</td>
                    <td className="px-6 py-4">
                      <span
                        style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.15em' }}
                        className="text-sm font-bold bg-amber-50 text-amber-900 px-3 py-1 rounded-lg"
                      >
                        {s.join_code}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell text-stone-600">
                      {dealerCount.get(s.id) ?? 0}
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell text-stone-500 text-xs">
                      {new Date(s.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
