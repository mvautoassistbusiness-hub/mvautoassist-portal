import { createClient } from '@/lib/supabase/client';

// Shared sign-out logic used by AdminSidebar, AgentSidebar, and SignOutButton.
// Callers handle their own routing after this resolves.
export async function signOutUser(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}
