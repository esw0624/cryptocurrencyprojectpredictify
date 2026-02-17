import type { AuthUser } from './supabaseClient';

const adminAllowList = new Set(
  ((import.meta as { env?: { VITE_ADMIN_EMAIL_ALLOWLIST?: string } }).env?.VITE_ADMIN_EMAIL_ALLOWLIST ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
);

export function isAdminUser(user: AuthUser | null): boolean {
  if (!user) return false;

  const email = user.email?.toLowerCase();
  if (email && adminAllowList.has(email)) return true;

  return user.app_metadata?.role === 'admin' || user.user_metadata?.role === 'admin';
}
