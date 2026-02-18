import { type FormEvent, useState } from 'react';

import { isAdminUser } from '../lib/auth';
import { hasSupabaseEnv, supabase } from '../lib/supabaseClient';

type AuthMode = 'client' | 'admin';

const configuredAuthRedirectUrl = (import.meta as { env?: { VITE_AUTH_REDIRECT_URL?: string } }).env?.VITE_AUTH_REDIRECT_URL?.trim();

function getAuthRedirectUrl() {
  if (configuredAuthRedirectUrl) return configuredAuthRedirectUrl;

  if (typeof window === 'undefined') return undefined;
  return window.location.origin;
}

export function AuthPanel() {
  const [mode, setMode] = useState<AuthMode>('client');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClientOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    const { error: requestError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: getAuthRedirectUrl() }
    });

    if (requestError) {
      setError(requestError.message);
    } else {
      const redirectUrl = getAuthRedirectUrl();
      setMessage(
        `Magic link sent. Open your email and click the verification link to sign in${redirectUrl ? ` (redirect: ${redirectUrl})` : ''}.`
      );
    }

    setLoading(false);
  }

  async function handleAdminSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    const { data, error: requestError } = await supabase.auth.signInWithPassword({ email, password });

    if (requestError) {
      setError(requestError.message);
      setLoading(false);
      return;
    }

    if (!isAdminUser(data.user)) {
      await supabase.auth.signOut();
      setError('This account does not have admin access.');
      setLoading(false);
      return;
    }

    setMessage('Signed in as admin. Redirecting to admin console...');
    setLoading(false);
  }

  if (!hasSupabaseEnv) {
    return (
      <div className="auth-page">
        <section className="auth-card panel">
          <h1>Connect Supabase first</h1>
          <p className="muted">Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY in apps/web/.env.local. Optionally set VITE_AUTH_REDIRECT_URL to your deployed web URL.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <section className="auth-card panel">
        <p className="top-nav__caption">Authentication</p>
        <h1>Sign in to Predictify</h1>
        <p className="muted">Use client login for email-verified magic links or admin login for console access.</p>

        <div className="auth-mode-toggle">
          <button className={`chip ${mode === 'client' ? 'chip--active' : ''}`} onClick={() => setMode('client')} type="button">
            Client sign in
          </button>
          <button className={`chip ${mode === 'admin' ? 'chip--active' : ''}`} onClick={() => setMode('admin')} type="button">
            Admin sign in
          </button>
        </div>

        {mode === 'client' ? (
          <form className="auth-form" onSubmit={handleClientOtp}>
            <label className="label" htmlFor="client-email">Email</label>
            <input id="client-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            <button className="chip chip--active auth-submit" disabled={loading} type="submit">{loading ? 'Sending...' : 'Send magic link'}</button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleAdminSignIn}>
            <label className="label" htmlFor="admin-email">Admin email</label>
            <input id="admin-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            <label className="label" htmlFor="admin-password">Password</label>
            <input id="admin-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
            <button className="chip chip--active auth-submit" disabled={loading} type="submit">{loading ? 'Signing in...' : 'Sign in as admin'}</button>
          </form>
        )}

        {message ? <p className="status">{message}</p> : null}
        {error ? <p className="status status--error">{error}</p> : null}
      </section>
    </div>
  );
}
