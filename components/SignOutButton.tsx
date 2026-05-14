'use client';

import { useRouter } from 'next/navigation';
import { signOutUser } from '@/lib/auth/signOut';

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await signOutUser();
    router.push('/login');
  }

  return (
    <button
      onClick={handleSignOut}
      className="px-4 py-2 text-sm font-medium text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-100 hover:text-slate-900 transition-all"
    >
      Sign out
    </button>
  );
}
