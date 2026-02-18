export interface AuthUser {
  id: string;
  email?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

export interface AuthSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: AuthUser;
}

type AuthStateChangeEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED';

type AuthListener = (event: AuthStateChangeEvent, session: AuthSession | null) => void;

const env = (import.meta as {
  env?: {
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
    VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY?: string;
  };
}).env;
const defaultSupabaseUrl = 'https://pietlhvbfihcgfxmoysn.supabase.co';
const defaultSupabasePublishableKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpZXRsaHZiZmloY2dmeG1veXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MTk0NTMsImV4cCI6MjA4NjQ5NTQ1M30.UaXACKWyUR8vYJQT9Fd-eXXnIK4s2mkF7Dk0V694Qg8';

const supabaseUrl = (env?.VITE_SUPABASE_URL ?? defaultSupabaseUrl).replace(/\/$/, '');
const supabaseAnonKey = env?.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? env?.VITE_SUPABASE_ANON_KEY ?? defaultSupabasePublishableKey;
const STORAGE_KEY = 'predictify-auth-session';

export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

const listeners = new Set<AuthListener>();

function readSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

function writeSession(session: AuthSession | null) {
  if (typeof window === 'undefined') return;

  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }
}

function notify(event: AuthStateChangeEvent, session: AuthSession | null) {
  for (const listener of listeners) {
    listener(event, session);
  }
}

async function authRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${supabaseUrl}${path}`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey as string,
      Authorization: `Bearer ${supabaseAnonKey as string}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const payload = (await response.json()) as T & { error_description?: string; msg?: string };
  if (!response.ok) {
    throw new Error(payload.error_description || payload.msg || `Auth request failed with ${response.status}`);
  }

  return payload;
}

interface OtpResponse {
  msg?: string;
}

interface PasswordSignInResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: AuthUser;
}

interface VerifyOtpResponse {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: AuthUser;
}


function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const decoded = window.atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function buildSession(payload: {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: AuthUser;
}): AuthSession {
  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: payload.expires_at,
    user: payload.user
  };
}

function readHashSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  if (!accessToken) return null;

  const userRaw = params.get('user');
  let user: AuthUser | null = null;

  if (userRaw) {
    try {
      user = JSON.parse(decodeURIComponent(userRaw)) as AuthUser;
    } catch {
      user = null;
    }
  }

  if (!user) {
    const payload = decodeJwtPayload(accessToken);
    const sub = payload?.sub;
    const email = payload?.email;
    if (typeof sub === 'string') {
      user = {
        id: sub,
        ...(typeof email === 'string' ? { email } : {})
      };
    }
  }

  if (!user) {
    return null;
  }

  const expiresAtRaw = params.get('expires_at');
  const expiresAt = expiresAtRaw ? Number.parseInt(expiresAtRaw, 10) : undefined;

  return buildSession({
    access_token: accessToken,
    refresh_token: params.get('refresh_token') ?? undefined,
    expires_at: Number.isFinite(expiresAt) ? expiresAt : undefined,
    user
  });
}

function cleanAuthParamsFromUrl() {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  const authQueryParams = ['token_hash', 'type', 'next'];
  let hasAuthQueryParams = false;

  for (const key of authQueryParams) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      hasAuthQueryParams = true;
    }
  }

  const hadHash = Boolean(url.hash);
  if (hadHash) {
    url.hash = '';
  }

  if (hadHash || hasAuthQueryParams) {
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
  }
}

async function readSessionFromUrl(): Promise<AuthSession | null> {
  if (typeof window === 'undefined') return null;

  const hashSession = readHashSession();
  if (hashSession) {
    cleanAuthParamsFromUrl();
    return hashSession;
  }

  const url = new URL(window.location.href);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  if (!tokenHash || !type) return null;

  try {
    const payload = await authRequest<VerifyOtpResponse>('/auth/v1/verify', {
      token_hash: tokenHash,
      type
    });
    cleanAuthParamsFromUrl();
    return buildSession(payload);
  } catch {
    return null;
  }
}

export const supabase = hasSupabaseEnv
  ? {
      auth: {
        async getSession() {
          const urlSession = await readSessionFromUrl();
          if (urlSession) {
            writeSession(urlSession);
            notify('SIGNED_IN', urlSession);
            return { data: { session: urlSession } };
          }

          return { data: { session: readSession() } };
        },
        onAuthStateChange(listener: AuthListener) {
          listeners.add(listener);
          return {
            data: {
              subscription: {
                unsubscribe() {
                  listeners.delete(listener);
                }
              }
            }
          };
        },
        async signInWithOtp({ email, options }: { email: string; options?: { emailRedirectTo?: string } }) {
          try {
            await authRequest<OtpResponse>('/auth/v1/otp', {
              email,
              create_user: true,
              ...(options?.emailRedirectTo ? { email_redirect_to: options.emailRedirectTo } : {})
            });
            return { error: null };
          } catch (error) {
            return { error: error instanceof Error ? error : new Error('Unable to send magic link.') };
          }
        },
        async signInWithPassword({ email, password }: { email: string; password: string }) {
          try {
            const payload = await authRequest<PasswordSignInResponse>('/auth/v1/token?grant_type=password', {
              email,
              password
            });
            const session = buildSession(payload);
            writeSession(session);
            notify('SIGNED_IN', session);
            return { data: { user: payload.user, session }, error: null };
          } catch (error) {
            return { data: { user: null, session: null }, error: error instanceof Error ? error : new Error('Unable to sign in.') };
          }
        },
        async signOut() {
          writeSession(null);
          notify('SIGNED_OUT', null);
        }
      }
    }
  : null;
