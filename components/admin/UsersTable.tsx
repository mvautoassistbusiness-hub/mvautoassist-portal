'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import EditUserButton from '@/components/admin/EditUserButton';
import ResetPasswordButton from '@/components/admin/ResetPasswordButton';

export type UserForTable = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  location: string | null;
  showroom: { id: string; name: string } | null;
  certCount: number;
  prices: number[];
  helpline: string | null;
  dailyLimit: number | null;
  must_change_password: boolean;
};

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

export default function UsersTable({
  users,
  showrooms,
  globalHelpline,
  globalDailyLimit,
}: {
  users: UserForTable[];
  showrooms: { id: string; name: string }[];
  globalHelpline: string;
  globalDailyLimit: number;
}) {
  const [showroomFilter, setShowroomFilter] = useState('all');

  const filtered = users.filter(u => {
    if (showroomFilter === 'all') return true;
    if (showroomFilter === 'unassigned') return u.role === 'dealer' && !u.showroom;
    return u.showroom?.id === showroomFilter;
  });

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between gap-4">
        <p className="text-sm text-stone-500">
          {filtered.length} of {users.length} user{users.length !== 1 ? 's' : ''}
        </p>
        <select
          value={showroomFilter}
          onChange={e => setShowroomFilter(e.target.value)}
          className="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-slate-900 transition-colors bg-white shrink-0"
        >
          <option value="all">All showrooms</option>
          {showrooms.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
          <option value="unassigned">Unassigned</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm font-semibold text-stone-400">
            {showroomFilter === 'all' ? 'No users found' : 'No users in this showroom'}
          </p>
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
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-stone-50 transition-colors">
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
                        {u.role === 'dealer' && (
                          <div className={`text-[10px] truncate mt-0.5 ${u.showroom ? 'text-stone-400' : 'text-stone-300'}`}>
                            {u.showroom?.name ?? 'No showroom'}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 hidden sm:table-cell">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      u.role === 'admin'
                        ? 'bg-slate-900 text-white'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {u.role}
                    </span>
                  </td>

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

                  <td className="px-6 py-4 font-semibold">{u.certCount}</td>

                  <td className="px-6 py-4 hidden lg:table-cell">
                    {u.prices.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {u.prices.map(p => (
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
                        currentHelpline={u.helpline}
                        globalHelpline={globalHelpline}
                        currentDailyLimit={u.dailyLimit}
                        globalDailyLimit={globalDailyLimit}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
