import { useEffect, useState } from 'react';

import { AuthPanel } from './components/AuthPanel';
import { isAdminUser } from './lib/auth';
import { hasSupabaseEnv, supabase, type AuthSession } from './lib/supabaseClient';
import { AdminConsole } from './pages/AdminConsole';
import { Dashboard } from './pages/Dashboard';

export function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(hasSupabaseEnv);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <p className="status">Checking your session…</p>;
  }

  if (!session) {
    return <AuthPanel />;
  }

  if (isAdminUser(session.user)) {
    return <AdminConsole accessToken={session.access_token} email={session.user.email} onSignOut={() => supabase!.auth.signOut()} />;
  }

  return <Dashboard />;
}
