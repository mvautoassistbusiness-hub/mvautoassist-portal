import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AgentSidebar from '@/components/agent/AgentSidebar';

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, role, location')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'dealer') redirect('/login');

  return (
    <div
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      className="flex min-h-screen bg-stone-50 text-slate-900"
    >
      <AgentSidebar fullName={profile.full_name} location={profile.location} />
      <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
    </div>
  );
}
