export interface PlatformAuditLog {
  id: string;
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  createdAt: string;
}

const CONFIGURED_API_BASE_URL = (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL?.replace(/\/$/, '');
const API_BASE_URL = CONFIGURED_API_BASE_URL ?? 'http://localhost:3000/api';

async function authedRequest<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const platformApi = {
  getMe(token: string) {
    return authedRequest<{ user: { id: string; email?: string; role: 'user' | 'admin' } }>('/me', token);
  },
  getAuditLogs(token: string, limit = 100) {
    return authedRequest<{ logs: PlatformAuditLog[]; count: number }>(`/admin/audit-logs?limit=${limit}`, token);
  }
};
