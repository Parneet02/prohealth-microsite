'use client';

import { useCallback, useEffect, useState } from 'react';
import { PROGRAMS } from '@/lib/programs';

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [input, setInput] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('prohealth_admin_token');
    if (saved) setToken(saved);
  }, []);

  const load = useCallback(async (t) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/leads?limit=500', { headers: { 'x-admin-token': t } });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.message || 'Could not load registrations.');
        setData(null);
        return;
      }
      setData(json);
      sessionStorage.setItem('prohealth_admin_token', t);
    } catch {
      setError('Network problem while loading registrations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) load(token);
  }, [token, load]);

  function signOut() {
    sessionStorage.removeItem('prohealth_admin_token');
    setToken('');
    setData(null);
    setInput('');
  }

  if (!token || (!data && error)) {
    return (
      <main className="admin-page">
        <h1>ProHealth registrations</h1>
        <p className="lead">Enter the admin token to view captured interest.</p>
        <div className="gate">
          <input
            type="password"
            placeholder="Admin token"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setToken(input.trim())}
          />
          <button onClick={() => setToken(input.trim())}>Open dashboard</button>
          {error && <div className="gate-error">{error}</div>}
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <h1>ProHealth registrations</h1>
      <p className="lead">
        Live from MongoDB. {loading ? 'Refreshing.' : `${data?.total ?? 0} registrations captured.`}
      </p>

      <div className="admin-panel">
        <div className="stat">
          <div className="box">
            <div className="n">{data?.total ?? 0}</div>
            <div className="l">Total registrations</div>
          </div>
          {PROGRAMS.map((p) => (
            <div className="box" key={p.key}>
              <div className="n">{data?.counts?.[p.key] ?? 0}</div>
              <div className="l">{p.name.replace('ProHealth ', '')}</div>
            </div>
          ))}
          <div className="box">
            <div className="n">{data?.downloads ?? 0}</div>
            <div className="l">Brochure downloads</div>
          </div>
        </div>

        <div className="tbl-wrap">
          <table className="leads-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>Emp ID</th>
                <th>Email</th>
                <th>Location</th>
                <th>Service</th>
                <th>Downloads</th>
                <th>Mail</th>
              </tr>
            </thead>
            <tbody>
              {!data?.rows?.length && (
                <tr>
                  <td colSpan={9}>
                    <div className="empty">No registrations captured yet.</div>
                  </td>
                </tr>
              )}
              {data?.rows?.map((r) => (
                <tr key={r._id}>
                  <td>
                    {new Date(r.createdAt).toLocaleString('en-IN', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                      timeZone: 'Asia/Kolkata',
                    })}
                  </td>
                  <td>{r.fullName}</td>
                  <td>{r.mobile}</td>
                  <td>{r.empId}</td>
                  <td>{r.email}</td>
                  <td>{r.location}</td>
                  <td>{r.service}</td>
                  <td>{r.brochureDownloads ?? 0}</td>
                  <td>{r.notification?.sent ? 'sent' : r.notification?.reason || 'failed'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-actions">
          <button className="mini" onClick={() => load(token)}>
            Refresh
          </button>
          <a
            className="mini"
            href={`/api/admin/export?token=${encodeURIComponent(token)}`}
            style={{ textDecoration: 'none' }}
          >
            Export CSV
          </a>
          <button className="mini danger" onClick={signOut}>
            Sign out
          </button>
        </div>

        <div className="cfg">
          <b>Note:</b> the CSV export contains personal data. Share it only through approved HCL
          channels, and rotate ADMIN_TOKEN in Vercel if it is ever pasted somewhere public.
        </div>
      </div>
    </main>
  );
}
