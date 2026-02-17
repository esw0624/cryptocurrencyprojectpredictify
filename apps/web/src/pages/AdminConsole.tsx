import { useEffect, useState } from 'react';

import { platformApi, type PlatformAuditLog } from '../lib/platformApi';

interface AdminConsoleProps {
  accessToken: string;
  email?: string;
  onSignOut: () => Promise<void>;
}

export function AdminConsole({ accessToken, email, onSignOut }: AdminConsoleProps) {
  const [logs, setLogs] = useState<PlatformAuditLog[]>([]);
  const [status, setStatus] = useState('Loading admin audit logs...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [meResponse, logResponse] = await Promise.all([
          platformApi.getMe(accessToken),
          platformApi.getAuditLogs(accessToken, 50)
        ]);

        if (!active) return;

        setLogs(logResponse.logs);
        setStatus(`Signed in as ${meResponse.user.email ?? meResponse.user.id}`);
      } catch (requestError) {
        if (!active) return;
        setError(requestError instanceof Error ? requestError.message : 'Unable to load admin data.');
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [accessToken]);

  return (
    <div className="dashboard">
      <header className="top-nav">
        <div>
          <div className="brand">Predictify Admin</div>
          <p className="brand-subtitle">{email ?? 'Administrator'}</p>
        </div>
        <div className="top-nav__controls">
          <p className="top-nav__caption">{status}</p>
          <button className="chip" onClick={() => void onSignOut()} type="button">Sign out</button>
        </div>
      </header>

      {error ? <p className="status status--error">{error}</p> : null}

      <section className="panel">
        <div className="panel__header">
          <h2>Recent audit activity</h2>
          <span className="timeline-pill">Last 50 events</span>
        </div>

        <div className="prediction-table-wrap">
          <table className="prediction-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Resource</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((entry) => (
                <tr key={entry.id}>
                  <td>{new Date(entry.createdAt).toLocaleString()}</td>
                  <td>{entry.actorUserId}</td>
                  <td>{entry.action}</td>
                  <td>{entry.resourceType}:{entry.resourceId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
