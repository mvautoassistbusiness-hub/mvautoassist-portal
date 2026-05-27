'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Shield, LayoutDashboard, FileText, Users,
  IndianRupee, LogOut, Menu, X, BarChart2,
} from 'lucide-react';
import { signOutUser } from '@/lib/auth/signOut';

const NAV = [
  { href: '/admin/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/admin/certificates', label: 'Certificates', icon: FileText },
  { href: '/admin/users',        label: 'Users & Roles', icon: Users },
  { href: '/admin/pricing',      label: 'Pricing Rules', icon: IndianRupee },
  { href: '/admin/reports',      label: 'Reports',       icon: BarChart2 },
];

// Static base classes in a plain string so Tailwind v4's scanner never misses them.
const ASIDE_BASE =
  'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col shrink-0 transform transition-transform duration-200';

export default function AdminSidebar({ fullName }: { fullName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await signOutUser();
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      {/* Mobile hamburger */}
      <button
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white rounded-lg border border-stone-200 shadow-sm"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`${ASIDE_BASE} ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        {/* Brand header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)' }}
            >
              <Shield className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-bold tracking-tight text-sm">MVAutoAssist</div>
              <div className="text-[10px] text-stone-400 tracking-[0.2em] uppercase">Admin Portal</div>
            </div>
          </div>
          {/* Close button visible only on mobile */}
          <button
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="lg:hidden text-stone-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(item => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  active
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-stone-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User identity + sign out — Fix 5: matches demo layout exactly */}
        <div className="p-3 border-t border-white/10">
          {/* User chip: rounded card with avatar + name + role */}
          <div className="flex items-center gap-3 p-2 rounded-lg mb-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-red-500 flex items-center justify-center font-bold text-sm shrink-0">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{fullName}</div>
              <div className="text-[10px] text-stone-400 uppercase tracking-wider">Admin</div>
            </div>
          </div>
          {/* Sign out: full-width text button below the chip */}
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-stone-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>

      </aside>
    </>
  );
}
