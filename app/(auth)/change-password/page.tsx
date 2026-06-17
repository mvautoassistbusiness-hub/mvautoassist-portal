import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ChangePasswordForm from './ChangePasswordForm';

export const metadata: Metadata = {
  title: 'Set New Password · MVAutoAssist',
};

export default async function ChangePasswordPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('must_change_password, role')
    .eq('id', user.id)
    .single();

  // If the flag is already cleared, send them to their dashboard
  if (!profile?.must_change_password) {
    redirect(profile?.role === 'admin' ? '/admin/dashboard' : '/agent/certificates');
  }

  return <ChangePasswordForm />;
}
